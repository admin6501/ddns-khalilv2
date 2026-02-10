#!/usr/bin/env python3
import requests
import json
import sys
from datetime import datetime
import uuid

class DNSAPITester:
    def __init__(self, base_url="https://namehost.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_records = []  # Track created records for cleanup
        
        # Generate unique test data
        timestamp = int(datetime.now().timestamp())
        self.test_data = {
            "email": f"testuser_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}"
        }
        
    def log_result(self, test_name, success, response_data=None, error=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
            
        result = {
            "test": test_name,
            "success": success,
            "response": response_data,
            "error": str(error) if error else None
        }
        self.test_results.append(result)
        
        print(f"{status} - {test_name}")
        if not success and error:
            print(f"   Error: {error}")
        return success

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make API request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
            
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            success = response.status_code == expected_status
            response_data = None
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
                
            return success, response_data, None
            
        except Exception as e:
            return False, None, str(e)

    def test_user_registration(self):
        """Test user registration"""
        success, response, error = self.make_request(
            'POST', 'auth/register', 
            self.test_data, 
            expected_status=200
        )
        
        if success and response and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user', {}).get('id')
            
        return self.log_result(
            "User Registration", 
            success and 'token' in (response or {}), 
            response, error
        )

    def test_user_login(self):
        """Test user login"""
        login_data = {
            "email": self.test_data["email"],
            "password": self.test_data["password"]
        }
        
        success, response, error = self.make_request(
            'POST', 'auth/login', 
            login_data, 
            expected_status=200
        )
        
        if success and response and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user', {}).get('id')
            
        return self.log_result(
            "User Login", 
            success and 'token' in (response or {}), 
            response, error
        )

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response, error = self.make_request(
            'GET', 'auth/me', 
            expected_status=200
        )
        
        return self.log_result(
            "Get Current User", 
            success and response and 'id' in response, 
            response, error
        )

    def test_get_plans(self):
        """Test getting available plans"""
        success, response, error = self.make_request(
            'GET', 'plans',
            expected_status=200
        )
        
        plans_valid = False
        if success and response and 'plans' in response:
            plans = response['plans']
            plans_valid = (
                len(plans) == 3 and
                all('id' in plan and 'name' in plan for plan in plans)
            )
        
        return self.log_result(
            "Get Plans (should return 3 plans)", 
            success and plans_valid, 
            response, error
        )

    def test_list_dns_records_empty(self):
        """Test listing DNS records (should be empty initially)"""
        success, response, error = self.make_request(
            'GET', 'dns/records',
            expected_status=200
        )
        
        return self.log_result(
            "List DNS Records (empty)", 
            success and response and response.get('count', -1) == 0, 
            response, error
        )

    def test_create_dns_record(self, record_data):
        """Test creating a DNS record"""
        success, response, error = self.make_request(
            'POST', 'dns/records', 
            record_data, 
            expected_status=201
        )
        
        if success and response and 'id' in response:
            self.created_records.append(response['id'])
            
        return self.log_result(
            f"Create DNS Record ({record_data['record_type']})", 
            success and 'id' in (response or {}), 
            response, error
        )

    def test_list_dns_records_with_data(self):
        """Test listing DNS records after creating some"""
        success, response, error = self.make_request(
            'GET', 'dns/records',
            expected_status=200
        )
        
        return self.log_result(
            "List DNS Records (with data)", 
            success and response and response.get('count', 0) > 0, 
            response, error
        )

    def test_update_dns_record(self, record_id):
        """Test updating a DNS record"""
        update_data = {
            "content": "192.168.1.100",
            "ttl": 300
        }
        
        success, response, error = self.make_request(
            'PUT', f'dns/records/{record_id}', 
            update_data, 
            expected_status=200
        )
        
        return self.log_result(
            "Update DNS Record", 
            success and response, 
            response, error
        )

    def test_delete_dns_record(self, record_id):
        """Test deleting a DNS record"""
        success, response, error = self.make_request(
            'DELETE', f'dns/records/{record_id}',
            expected_status=200
        )
        
        if success and record_id in self.created_records:
            self.created_records.remove(record_id)
            
        return self.log_result(
            "Delete DNS Record", 
            success, 
            response, error
        )

    def test_record_limit_enforcement(self):
        """Test that record limit (2) is enforced"""
        # Try to create third record (should fail)
        third_record = {
            "name": f"limit-test-{int(datetime.now().timestamp())}",
            "record_type": "A",
            "content": "192.168.1.3",
            "ttl": 1
        }
        
        success, response, error = self.make_request(
            'POST', 'dns/records', 
            third_record, 
            expected_status=403  # Should be forbidden
        )
        
        return self.log_result(
            "Record Limit Enforcement (should fail on 3rd record)", 
            success,  # Success means we got 403 as expected
            response, error
        )

    def cleanup_records(self):
        """Clean up any created records"""
        print("\n🧹 Cleaning up test records...")
        for record_id in self.created_records[:]:
            try:
                self.test_delete_dns_record(record_id)
            except:
                pass

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting DNS API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 50)
        
        # 1. Test user registration
        if not self.test_user_registration():
            print("❌ Registration failed, cannot continue")
            return False
            
        # 2. Test getting current user
        self.test_get_current_user()
        
        # 3. Test plans endpoint
        self.test_get_plans()
        
        # 4. Test listing empty records
        self.test_list_dns_records_empty()
        
        # 5. Create first DNS record (A record)
        record1 = {
            "name": f"test1-{int(datetime.now().timestamp())}",
            "record_type": "A",
            "content": "192.168.1.1",
            "ttl": 1
        }
        self.test_create_dns_record(record1)
        
        # 6. Create second DNS record (CNAME record)
        record2 = {
            "name": f"test2-{int(datetime.now().timestamp())}",
            "record_type": "CNAME", 
            "content": "example.com",
            "ttl": 1
        }
        self.test_create_dns_record(record2)
        
        # 7. List records with data
        self.test_list_dns_records_with_data()
        
        # 8. Update first record
        if self.created_records:
            self.test_update_dns_record(self.created_records[0])
            
        # 9. Test record limit enforcement
        self.test_record_limit_enforcement()
        
        # 10. Clean up
        self.cleanup_records()
        
        # Summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            failed_tests = [r for r in self.test_results if not r['success']]
            print(f"❌ {len(failed_tests)} tests failed:")
            for test in failed_tests:
                print(f"   - {test['test']}: {test['error']}")
            return False

def main():
    tester = DNSAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/tmp/api_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'total_tests': tester.tests_run,
                'passed_tests': tester.tests_passed,
                'success_rate': tester.tests_passed / tester.tests_run if tester.tests_run > 0 else 0
            },
            'detailed_results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
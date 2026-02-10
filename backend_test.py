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
        """Test getting available plans (legacy test)"""
        success, response, error = self.make_request(
            'GET', 'plans',
            expected_status=200
        )
        
        plans_valid = False
        if success and response and 'plans' in response:
            plans = response['plans']
            plans_valid = (
                len(plans) >= 3 and
                all('plan_id' in plan and 'name' in plan for plan in plans)
            )
        
        return self.log_result(
            "Get Plans (legacy test)", 
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

    def test_admin_login(self):
        """Test admin login with correct credentials"""
        admin_data = {
            "email": "admin@khalilv2.com",
            "password": "admin123456"
        }
        
        success, response, error = self.make_request(
            'POST', 'auth/login', 
            admin_data, 
            expected_status=200
        )
        
        if success and response and 'token' in response:
            self.admin_token = response['token']
            self.admin_user = response.get('user', {})
            
        return self.log_result(
            "Admin Login", 
            success and 'token' in (response or {}) and 
            response.get('user', {}).get('role') == 'admin', 
            response, error
        )

    def test_admin_list_users(self):
        """Test admin can list all users"""
        # Store current token
        current_token = self.token
        self.token = self.admin_token
        
        success, response, error = self.make_request(
            'GET', 'admin/users',
            expected_status=200
        )
        
        # Restore token
        self.token = current_token
        
        return self.log_result(
            "Admin List Users", 
            success and response and 'users' in response, 
            response, error
        )

    def test_admin_list_all_records(self):
        """Test admin can list all DNS records"""
        # Store current token
        current_token = self.token
        self.token = self.admin_token
        
        success, response, error = self.make_request(
            'GET', 'admin/records',
            expected_status=200
        )
        
        # Restore token
        self.token = current_token
        
        return self.log_result(
            "Admin List All Records", 
            success and response and 'records' in response, 
            response, error
        )

    def test_admin_create_record_for_user(self):
        """Test admin can create record for any user"""
        if not self.user_id:
            return self.log_result(
                "Admin Create Record for User", 
                False, None, "No user_id available"
            )
            
        # Store current token
        current_token = self.token
        self.token = self.admin_token
        
        admin_record = {
            "user_id": self.user_id,
            "name": f"admin-test-{int(datetime.now().timestamp())}",
            "record_type": "A",
            "content": "10.0.0.1",
            "ttl": 1,
            "proxied": False
        }
        
        success, response, error = self.make_request(
            'POST', 'admin/dns/records', 
            admin_record, 
            expected_status=201
        )
        
        if success and response and 'id' in response:
            self.admin_created_record_id = response['id']
            
        # Restore token
        self.token = current_token
        
        return self.log_result(
            "Admin Create Record for User", 
            success and 'id' in (response or {}), 
            response, error
        )

    def test_admin_delete_record(self):
        """Test admin can delete any record"""
        if not hasattr(self, 'admin_created_record_id'):
            return self.log_result(
                "Admin Delete Record", 
                False, None, "No admin_created_record_id available"
            )
            
        # Store current token
        current_token = self.token
        self.token = self.admin_token
        
        success, response, error = self.make_request(
            'DELETE', f'admin/dns/records/{self.admin_created_record_id}',
            expected_status=200
        )
        
        # Restore token
        self.token = current_token
        
        return self.log_result(
            "Admin Delete Record", 
            success, 
            response, error
        )

    def test_admin_update_user_plan(self):
        """Test admin can update user plan"""
        if not self.user_id:
            return self.log_result(
                "Admin Update User Plan", 
                False, None, "No user_id available"
            )
            
        # Store current token
        current_token = self.token
        self.token = self.admin_token
        
        plan_update = {"plan": "pro"}
        
        success, response, error = self.make_request(
            'PUT', f'admin/users/{self.user_id}/plan', 
            plan_update, 
            expected_status=200
        )
        
        # Restore token
        self.token = current_token
        
        return self.log_result(
            "Admin Update User Plan", 
            success and response, 
            response, error
        )

    def test_admin_get_settings(self):
        """Test admin can get settings"""
        # Store current token
        current_token = self.token
        self.token = self.admin_token
        
        success, response, error = self.make_request(
            'GET', 'admin/settings',
            expected_status=200
        )
        
        # Restore token
        self.token = current_token
        
        return self.log_result(
            "Admin Get Settings", 
            success and response, 
            response, error
        )

    def test_admin_update_settings(self):
        """Test admin can update settings"""
        # Store current token
        current_token = self.token
        self.token = self.admin_token
        
        settings_update = {
            "telegram_id": "testadmin",
            "telegram_url": "https://t.me/testadmin",
            "contact_message_en": "Contact us on Telegram for pricing",
            "contact_message_fa": "برای استعلام قیمت در تلگرام تماس بگیرید"
        }
        
        success, response, error = self.make_request(
            'PUT', 'admin/settings', 
            settings_update, 
            expected_status=200
        )
        
        # Restore token
        self.token = current_token
        
        return self.log_result(
            "Admin Update Settings", 
            success and response, 
            response, error
        )

    def test_admin_change_user_password(self):
        """Test admin can change any user's password"""
        if not self.user_id:
            return self.log_result(
                "Admin Change User Password", 
                False, None, "No user_id available"
            )
            
        # Store current token
        current_token = self.token
        self.token = self.admin_token
        
        password_update = {"new_password": "NewTestPass123!"}
        
        success, response, error = self.make_request(
            'PUT', f'admin/users/{self.user_id}/password', 
            password_update, 
            expected_status=200
        )
        
        # Restore token
        self.token = current_token
        
        # Store new password for later login test
        if success:
            self.test_data["password"] = password_update["new_password"]
        
        return self.log_result(
            "Admin Change User Password", 
            success and response, 
            response, error
        )

    def test_user_login_after_password_change(self):
        """Test user can login with new password after admin change"""
        login_data = {
            "email": self.test_data["email"],
            "password": self.test_data["password"]  # Now the new password
        }
        
        success, response, error = self.make_request(
            'POST', 'auth/login', 
            login_data, 
            expected_status=200
        )
        
        if success and response and 'token' in response:
            self.token = response['token']
            
        return self.log_result(
            "User Login After Password Change", 
            success and 'token' in (response or {}), 
            response, error
        )

    def test_admin_list_plans(self):
        """Test admin can list all plans"""
        # Store current token
        current_token = self.token
        self.token = self.admin_token
        
        success, response, error = self.make_request(
            'GET', 'admin/plans',
            expected_status=200
        )
        
        # Restore token
        self.token = current_token
        
        return self.log_result(
            "Admin List Plans", 
            success and response and 'plans' in response, 
            response, error
        )

    def test_admin_create_plan(self):
        """Test admin can create a new plan"""
        # Store current token
        current_token = self.token
        self.token = self.admin_token
        
        timestamp = int(datetime.now().timestamp())
        self.test_plan_id = f"testplan_{timestamp}"
        
        plan_data = {
            "plan_id": self.test_plan_id,
            "name": "Test Plan",
            "name_fa": "پلن تست",
            "price": "$15/mo",
            "price_fa": "۱۵ دلار/ماه",
            "record_limit": 25,
            "features": ["25 DNS Records", "Basic Support", "Test Feature"],
            "features_fa": ["۲۵ رکورد DNS", "پشتیبانی پایه", "امکان تست"],
            "popular": False,
            "sort_order": 10
        }
        
        success, response, error = self.make_request(
            'POST', 'admin/plans', 
            plan_data, 
            expected_status=201
        )
        
        # Restore token
        self.token = current_token
        
        return self.log_result(
            "Admin Create Plan", 
            success and response and 'plan_id' in (response or {}), 
            response, error
        )

    def test_admin_update_plan(self):
        """Test admin can update an existing plan"""
        if not hasattr(self, 'test_plan_id'):
            return self.log_result(
                "Admin Update Plan", 
                False, None, "No test_plan_id available"
            )
            
        # Store current token
        current_token = self.token
        self.token = self.admin_token
        
        plan_update = {
            "name": "Updated Test Plan",
            "price": "$20/mo",
            "record_limit": 30,
            "popular": True
        }
        
        success, response, error = self.make_request(
            'PUT', f'admin/plans/{self.test_plan_id}', 
            plan_update, 
            expected_status=200
        )
        
        # Restore token
        self.token = current_token
        
        return self.log_result(
            "Admin Update Plan", 
            success and response, 
            response, error
        )

    def test_admin_delete_plan(self):
        """Test admin can delete a plan (only if no users on it)"""
        if not hasattr(self, 'test_plan_id'):
            return self.log_result(
                "Admin Delete Plan", 
                False, None, "No test_plan_id available"
            )
            
        # Store current token
        current_token = self.token
        self.token = self.admin_token
        
        success, response, error = self.make_request(
            'DELETE', f'admin/plans/{self.test_plan_id}',
            expected_status=200
        )
        
        # Restore token
        self.token = current_token
        
        return self.log_result(
            "Admin Delete Plan", 
            success and response, 
            response, error
        )

    def test_public_plans_api(self):
        """Test public plans API returns plans from DB"""
        success, response, error = self.make_request(
            'GET', 'plans',
            expected_status=200
        )
        
        plans_valid = False
        if success and response and 'plans' in response:
            plans = response['plans']
            # Should have at least 3 default plans (free, pro, enterprise)
            plans_valid = (
                len(plans) >= 3 and
                all('plan_id' in plan and 'name' in plan and 'record_limit' in plan for plan in plans)
            )
        
        return self.log_result(
            "Public Plans API (from DB)", 
            success and plans_valid, 
            response, error
        )

    def test_public_contact_api(self):
        """Test public contact info API"""
        success, response, error = self.make_request(
            'GET', 'settings/contact',
            expected_status=200
        )
        
        return self.log_result(
            "Public Contact API", 
            success and response, 
            response, error
        )

    def test_non_admin_access_denied(self):
        """Test non-admin user cannot access admin endpoints"""
        # Use regular user token (not admin)
        success, response, error = self.make_request(
            'GET', 'admin/users',
            expected_status=403  # Should be forbidden
        )
        
        return self.log_result(
            "Non-Admin Access Denied", 
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
        """Run all API tests including admin functionality"""
        print("🚀 Starting DNS API Tests (with Admin Panel)")
        print(f"Backend URL: {self.base_url}")
        print("=" * 50)
        
        # Initialize admin token
        self.admin_token = None
        self.admin_user = None
        
        # 1. Test admin login first
        if not self.test_admin_login():
            print("❌ Admin login failed, cannot continue with admin tests")
            return False
            
        # 2. Test user registration (for regular user tests)
        if not self.test_user_registration():
            print("❌ Registration failed, cannot continue")
            return False
            
        # 3. Test getting current user
        self.test_get_current_user()
        
        # 4. Test plans endpoints (both admin and public)
        self.test_admin_list_plans()
        self.test_public_plans_api()
        
        # 5. Test admin plan CRUD operations
        self.test_admin_create_plan()
        self.test_admin_update_plan()
        self.test_admin_delete_plan()
        
        # 6. Test admin user management
        self.test_admin_list_users()
        self.test_admin_change_user_password()
        self.test_user_login_after_password_change()  # Test new password works
        self.test_admin_update_user_plan()
        
        # 7. Test admin records management
        self.test_admin_list_all_records()
        self.test_admin_create_record_for_user()
        self.test_admin_delete_record()
        
        # 8. Test admin settings
        self.test_admin_get_settings()
        self.test_admin_update_settings()
        self.test_public_contact_api()
        
        # 9. Test access control
        self.test_non_admin_access_denied()
        
        # 10. Test regular DNS record operations
        self.test_list_dns_records_empty()
        
        # 11. Create first DNS record (A record)
        record1 = {
            "name": f"test1-{int(datetime.now().timestamp())}",
            "record_type": "A",
            "content": "192.168.1.1",
            "ttl": 1
        }
        self.test_create_dns_record(record1)
        
        # 12. Create second DNS record (CNAME record)
        record2 = {
            "name": f"test2-{int(datetime.now().timestamp())}",
            "record_type": "CNAME", 
            "content": "example.com",
            "ttl": 1
        }
        self.test_create_dns_record(record2)
        
        # 13. List records with data
        self.test_list_dns_records_with_data()
        
        # 14. Update first record
        if self.created_records:
            self.test_update_dns_record(self.created_records[0])
            
        # 15. Test record limit enforcement
        self.test_record_limit_enforcement()
        
        # 16. Clean up
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
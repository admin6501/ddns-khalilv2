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

    def test_create_bulk_test_users(self):
        """Create multiple test users for bulk operations"""
        # Store current token
        current_token = self.token
        
        self.bulk_test_users = []
        timestamp = int(datetime.now().timestamp())
        
        for i in range(3):  # Create 3 test users
            user_data = {
                "email": f"bulkuser{i}_{timestamp}@example.com",
                "password": "BulkTest123!",
                "name": f"Bulk Test User {i}"
            }
            
            success, response, error = self.make_request(
                'POST', 'auth/register', 
                user_data, 
                expected_status=200
            )
            
            if success and response and 'user' in response:
                self.bulk_test_users.append({
                    'id': response['user']['id'],
                    'email': user_data['email'],
                    'name': user_data['name']
                })
        
        # Restore token
        self.token = current_token
        
        return self.log_result(
            "Create Bulk Test Users", 
            len(self.bulk_test_users) == 3, 
            {"created_users": len(self.bulk_test_users)}, None
        )

    def test_admin_bulk_update_plan(self):
        """Test admin bulk plan update endpoint"""
        if not hasattr(self, 'bulk_test_users') or len(self.bulk_test_users) < 2:
            return self.log_result(
                "Admin Bulk Update Plan", 
                False, None, "No bulk_test_users available"
            )
        
        # Store current token
        current_token = self.token
        self.token = self.admin_token
        
        # Test bulk plan change with 2 users
        user_ids = [user['id'] for user in self.bulk_test_users[:2]]
        bulk_plan_data = {
            "user_ids": user_ids,
            "plan": "pro"
        }
        
        success, response, error = self.make_request(
            'POST', 'admin/users/bulk/plan', 
            bulk_plan_data, 
            expected_status=200
        )
        
        # Restore token
        self.token = current_token
        
        return self.log_result(
            "Admin Bulk Update Plan", 
            success and response and response.get('updated_count', 0) == 2, 
            response, error
        )

    def test_admin_bulk_delete_users(self):
        """Test admin bulk delete users endpoint"""
        if not hasattr(self, 'bulk_test_users') or len(self.bulk_test_users) < 2:
            return self.log_result(
                "Admin Bulk Delete Users", 
                False, None, "No bulk_test_users available"
            )
        
        # Store current token
        current_token = self.token
        self.token = self.admin_token
        
        # Test bulk delete with the last 2 users (save first one for admin exclusion test)
        user_ids = [user['id'] for user in self.bulk_test_users[1:]]
        bulk_delete_data = {
            "user_ids": user_ids
        }
        
        success, response, error = self.make_request(
            'POST', 'admin/users/bulk/delete', 
            bulk_delete_data, 
            expected_status=200
        )
        
        # Remove deleted users from our tracking list
        if success:
            self.bulk_test_users = self.bulk_test_users[:1]
        
        # Restore token
        self.token = current_token
        
        return self.log_result(
            "Admin Bulk Delete Users", 
            success and response and response.get('deleted_count', 0) == 2, 
            response, error
        )

    def test_admin_bulk_exclude_admin_users(self):
        """Test bulk operations properly exclude admin users"""
        # Store current token
        current_token = self.token
        self.token = self.admin_token
        
        # Get admin user ID from our stored admin_user
        admin_user_id = self.admin_user.get('id')
        if not admin_user_id:
            self.token = current_token
            return self.log_result(
                "Admin Bulk Exclude Admin Users", 
                False, None, "No admin user ID available"
            )
        
        # Try to bulk change plan including admin user - should skip admin
        bulk_plan_data = {
            "user_ids": [admin_user_id],  # Only admin user
            "plan": "free"
        }
        
        success, response, error = self.make_request(
            'POST', 'admin/users/bulk/plan', 
            bulk_plan_data, 
            expected_status=400  # Should fail with "No eligible users to update"
        )
        
        # Restore token
        self.token = current_token
        
        return self.log_result(
            "Admin Bulk Exclude Admin Users (Plan Change)", 
            success,  # Success means we got 400 as expected
            response, error
        )

    def test_admin_bulk_delete_exclude_admin_users(self):
        """Test bulk delete excludes admin users"""
        # Store current token
        current_token = self.token
        self.token = self.admin_token
        
        # Get admin user ID
        admin_user_id = self.admin_user.get('id')
        if not admin_user_id:
            self.token = current_token
            return self.log_result(
                "Admin Bulk Delete Exclude Admin Users", 
                False, None, "No admin user ID available"
            )
        
        # Try to bulk delete admin user - should skip admin, delete count = 0
        bulk_delete_data = {
            "user_ids": [admin_user_id]  # Only admin user
        }
        
        success, response, error = self.make_request(
            'POST', 'admin/users/bulk/delete', 
            bulk_delete_data, 
            expected_status=200
        )
        
        # Restore token
        self.token = current_token
        
        # Should succeed but with deleted_count = 0
        return self.log_result(
            "Admin Bulk Delete Exclude Admin Users", 
            success and response and response.get('deleted_count', -1) == 0, 
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

    def test_referral_system_setup(self):
        """Setup referral system test - create referrer user"""
        timestamp = int(datetime.now().timestamp())
        self.referrer_data = {
            "email": f"referrer_{timestamp}@example.com",
            "password": "ReferrerPass123!",
            "name": f"Referrer User {timestamp}"
        }
        
        success, response, error = self.make_request(
            'POST', 'auth/register', 
            self.referrer_data, 
            expected_status=200
        )
        
        if success and response and 'user' in response:
            self.referrer_user = response['user']
            self.referrer_token = response['token']
            # Store referral code
            self.referral_code = self.referrer_user.get('referral_code', '')
            
        return self.log_result(
            "Referral System Setup (Create Referrer)", 
            success and self.referral_code, 
            response, error
        )

    def test_user_has_referral_code_on_registration(self):
        """Test that new users get unique referral codes"""
        # Already tested in setup, just verify
        return self.log_result(
            "New User Gets Unique Referral Code", 
            bool(self.referral_code), 
            {"referral_code": self.referral_code}, None
        )

    def test_get_referral_stats_initial(self):
        """Test GET /api/referral/stats returns initial stats"""
        # Store current token and use referrer token
        current_token = self.token
        self.token = self.referrer_token
        
        success, response, error = self.make_request(
            'GET', 'referral/stats',
            expected_status=200
        )
        
        # Check response structure
        stats_valid = False
        if success and response:
            expected_fields = ['referral_code', 'referral_count', 'referral_bonus', 'bonus_per_invite', 'referred_users']
            stats_valid = all(field in response for field in expected_fields)
            # Should have 0 referrals initially
            stats_valid = stats_valid and response.get('referral_count', -1) == 0
            stats_valid = stats_valid and response.get('referral_bonus', -1) == 0
            
        # Restore token
        self.token = current_token
        
        return self.log_result(
            "Get Referral Stats (Initial)", 
            success and stats_valid, 
            response, error
        )

    def test_referral_bonus_in_admin_settings(self):
        """Test admin settings include referral_bonus_per_invite"""
        # Store current token
        current_token = self.token
        self.token = self.admin_token
        
        success, response, error = self.make_request(
            'GET', 'admin/settings',
            expected_status=200
        )
        
        # Check if referral_bonus_per_invite is present
        has_referral_bonus = False
        if success and response:
            has_referral_bonus = 'referral_bonus_per_invite' in response
            # Should have a default value
            has_referral_bonus = has_referral_bonus and isinstance(response.get('referral_bonus_per_invite'), int)
            
        # Restore token
        self.token = current_token
        
        return self.log_result(
            "Admin Settings Include Referral Bonus", 
            success and has_referral_bonus, 
            response, error
        )

    def test_update_referral_bonus_in_admin_settings(self):
        """Test admin can update referral_bonus_per_invite"""
        # Store current token
        current_token = self.token
        self.token = self.admin_token
        
        # Update referral bonus to 2 records per invite
        settings_update = {
            "referral_bonus_per_invite": 2
        }
        
        success, response, error = self.make_request(
            'PUT', 'admin/settings', 
            settings_update, 
            expected_status=200
        )
        
        # Verify update worked
        if success and response:
            success = response.get('referral_bonus_per_invite') == 2
            
        # Restore token
        self.token = current_token
        
        return self.log_result(
            "Admin Update Referral Bonus Setting", 
            success, 
            response, error
        )

    def test_registration_with_referral_code(self):
        """Test registration with referral code gives referrer bonus"""
        # First get referrer's current stats
        current_token = self.token
        self.token = self.referrer_token
        
        # Get initial stats
        initial_success, initial_response, _ = self.make_request(
            'GET', 'referral/stats',
            expected_status=200
        )
        
        initial_bonus = initial_response.get('referral_bonus', 0) if initial_response else 0
        initial_count = initial_response.get('referral_count', 0) if initial_response else 0
        
        # Get referrer's current record limit
        me_success, me_response, _ = self.make_request(
            'GET', 'auth/me',
            expected_status=200
        )
        initial_record_limit = me_response.get('record_limit', 0) if me_response else 0
        
        # Restore token
        self.token = current_token
        
        # Register new user with referral code
        timestamp = int(datetime.now().timestamp())
        referred_user_data = {
            "email": f"referred_{timestamp}@example.com",
            "password": "ReferredPass123!",
            "name": f"Referred User {timestamp}",
            "referral_code": self.referral_code
        }
        
        success, response, error = self.make_request(
            'POST', 'auth/register', 
            referred_user_data, 
            expected_status=200
        )
        
        if success and response:
            self.referred_user = response.get('user', {})
            # Verify referred_by is set
            success = success and response.get('user', {}).get('referred_by') is not None
            
        # Now check referrer got bonus
        self.token = self.referrer_token
        
        # Get updated stats
        final_success, final_response, _ = self.make_request(
            'GET', 'referral/stats',
            expected_status=200
        )
        
        # Get referrer's updated record limit
        me_final_success, me_final_response, _ = self.make_request(
            'GET', 'auth/me',
            expected_status=200
        )
        final_record_limit = me_final_response.get('record_limit', 0) if me_final_response else 0
        
        # Verify bonus was applied
        bonus_applied = False
        if final_response:
            expected_bonus = initial_bonus + 2  # We set bonus to 2 per invite
            expected_count = initial_count + 1
            expected_limit = initial_record_limit + 2
            
            bonus_applied = (
                final_response.get('referral_bonus', 0) == expected_bonus and
                final_response.get('referral_count', 0) == expected_count and
                final_record_limit >= initial_record_limit + 2  # Allow for plan upgrades
            )
            
        # Restore token
        self.token = current_token
        
        return self.log_result(
            "Registration with Referral Code (Bonus Applied)", 
            success and bonus_applied, 
            {
                "initial_bonus": initial_bonus, 
                "final_bonus": final_response.get('referral_bonus', 0) if final_response else 0,
                "initial_count": initial_count,
                "final_count": final_response.get('referral_count', 0) if final_response else 0,
                "initial_limit": initial_record_limit,
                "final_limit": final_record_limit,
                "expected_limit_min": initial_record_limit + 2,
                "bonus_check": final_response.get('referral_bonus', 0) == (initial_bonus + 2) if final_response else False,
                "count_check": final_response.get('referral_count', 0) == (initial_count + 1) if final_response else False,
                "limit_check": final_record_limit >= (initial_record_limit + 2),
                "referred_user_id": self.referred_user.get('id', '')
            }, error
        )

    def test_referral_stats_with_referred_users(self):
        """Test referral stats includes referred users list"""
        # Use referrer token
        current_token = self.token
        self.token = self.referrer_token
        
        success, response, error = self.make_request(
            'GET', 'referral/stats',
            expected_status=200
        )
        
        # Check referred users list
        referred_users_valid = False
        if success and response:
            referred_users = response.get('referred_users', [])
            referred_users_valid = (
                isinstance(referred_users, list) and
                len(referred_users) == 1 and  # Should have 1 referred user
                'name' in referred_users[0] and
                'date' in referred_users[0]
            )
            
        # Restore token
        self.token = current_token
        
        return self.log_result(
            "Referral Stats Include Referred Users List", 
            success and referred_users_valid, 
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
        
        # 9. Test bulk operations
        self.test_create_bulk_test_users()
        self.test_admin_bulk_update_plan()
        self.test_admin_bulk_delete_users()
        self.test_admin_bulk_exclude_admin_users()
        self.test_admin_bulk_delete_exclude_admin_users()
        
        # 10. Test referral system
        self.test_referral_system_setup()
        self.test_user_has_referral_code_on_registration()
        self.test_get_referral_stats_initial()
        self.test_referral_bonus_in_admin_settings()
        self.test_update_referral_bonus_in_admin_settings()
        self.test_registration_with_referral_code()
        self.test_referral_stats_with_referred_users()
        
        # 11. Test access control
        self.test_non_admin_access_denied()
        
        # 12. Test regular DNS record operations
        self.test_list_dns_records_empty()
        
        # 12. Create first DNS record (A record)
        record1 = {
            "name": f"test1-{int(datetime.now().timestamp())}",
            "record_type": "A",
            "content": "192.168.1.1",
            "ttl": 1
        }
        self.test_create_dns_record(record1)
        
        # 13. Create second DNS record (CNAME record)
        record2 = {
            "name": f"test2-{int(datetime.now().timestamp())}",
            "record_type": "CNAME", 
            "content": "example.com",
            "ttl": 1
        }
        self.test_create_dns_record(record2)
        
        # 14. List records with data
        self.test_list_dns_records_with_data()
        
        # 15. Update first record
        if self.created_records:
            self.test_update_dns_record(self.created_records[0])
            
        # 16. Test record limit enforcement
        self.test_record_limit_enforcement()
        
        # 17. Clean up
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
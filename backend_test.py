#!/usr/bin/env python3
"""
Backend Test Suite for DNS Management App - Telegram Bot Status and Public Endpoints
Testing public endpoints that don't require authentication
"""

import requests
import json
import sys
import time
from typing import Dict, Any

# Configuration
BASE_URL = "https://bot-activation-bug.preview.emergentagent.com/api"
TIMEOUT = 30

class BackendTester:
    def __init__(self):
        self.results = {
            "passed": [],
            "failed": [],
            "errors": []
        }
        
    def log_result(self, test_name: str, passed: bool, message: str = "", response_data: Any = None):
        """Log test result"""
        result = {
            "test": test_name,
            "passed": passed,
            "message": message,
            "data": response_data
        }
        
        if passed:
            self.results["passed"].append(result)
            print(f"✅ {test_name}: {message}")
        else:
            self.results["failed"].append(result)
            print(f"❌ {test_name}: {message}")
            
    def make_request(self, method: str, endpoint: str, **kwargs) -> tuple:
        """Make HTTP request with error handling"""
        url = f"{BASE_URL}{endpoint}"
        try:
            print(f"\n🔍 Testing {method.upper()} {url}")
            response = requests.request(method, url, timeout=TIMEOUT, **kwargs)
            return True, response
        except requests.exceptions.Timeout:
            return False, f"Request timed out after {TIMEOUT}s"
        except requests.exceptions.ConnectionError:
            return False, "Connection error - server may be down"
        except Exception as e:
            return False, f"Request error: {str(e)}"
    
    def test_telegram_status(self):
        """Test GET /api/telegram/status endpoint"""
        success, response = self.make_request("GET", "/telegram/status")
        
        if not success:
            self.log_result("Telegram Status Endpoint", False, f"Request failed: {response}")
            return
            
        if response.status_code != 200:
            self.log_result("Telegram Status Endpoint", False, 
                          f"Expected 200, got {response.status_code}")
            return
            
        try:
            data = response.json()
        except json.JSONDecodeError:
            self.log_result("Telegram Status Endpoint", False, "Response is not valid JSON")
            return
            
        # Check required fields according to review request
        required_fields = ["status", "bot_username", "app_running", "polling_running"]
        missing_fields = []
        
        for field in required_fields:
            if field not in data:
                missing_fields.append(field)
                
        if missing_fields:
            self.log_result("Telegram Status Endpoint", False, 
                          f"Missing required fields: {missing_fields}", data)
            return
            
        # Validate expected values from review request
        expected_status = "running"
        expected_bot_username = "@dns_hubbot"
        expected_app_running = True
        expected_polling_running = True
        
        validation_errors = []
        
        if data.get("status") != expected_status:
            validation_errors.append(f"status: expected '{expected_status}', got '{data.get('status')}'")
            
        if data.get("bot_username") != expected_bot_username:
            validation_errors.append(f"bot_username: expected '{expected_bot_username}', got '{data.get('bot_username')}'")
            
        if data.get("app_running") != expected_app_running:
            validation_errors.append(f"app_running: expected {expected_app_running}, got {data.get('app_running')}")
            
        if data.get("polling_running") != expected_polling_running:
            validation_errors.append(f"polling_running: expected {expected_polling_running}, got {data.get('polling_running')}")
            
        if validation_errors:
            self.log_result("Telegram Status Endpoint", False, 
                          f"Validation errors: {'; '.join(validation_errors)}", data)
        else:
            self.log_result("Telegram Status Endpoint", True, 
                          "All required fields present with expected values", data)
    
    def test_config_endpoint(self):
        """Test GET /api/config endpoint"""
        success, response = self.make_request("GET", "/config")
        
        if not success:
            self.log_result("Config Endpoint", False, f"Request failed: {response}")
            return
            
        if response.status_code != 200:
            self.log_result("Config Endpoint", False, 
                          f"Expected 200, got {response.status_code}")
            return
            
        try:
            data = response.json()
        except json.JSONDecodeError:
            self.log_result("Config Endpoint", False, "Response is not valid JSON")
            return
            
        # Check for expected domain-related fields
        expected_fields = ["domain", "dns_domain"]
        missing_fields = []
        
        for field in expected_fields:
            if field not in data:
                missing_fields.append(field)
                
        if missing_fields:
            self.log_result("Config Endpoint", False, 
                          f"Missing expected fields: {missing_fields}", data)
        else:
            domain_info = {
                "domain": data.get("domain"),
                "dns_domain": data.get("dns_domain")
            }
            self.log_result("Config Endpoint", True, 
                          f"Site config returned with domain info", domain_info)
    
    def test_plans_endpoint(self):
        """Test GET /api/plans endpoint"""
        success, response = self.make_request("GET", "/plans")
        
        if not success:
            self.log_result("Plans Endpoint", False, f"Request failed: {response}")
            return
            
        if response.status_code != 200:
            self.log_result("Plans Endpoint", False, 
                          f"Expected 200, got {response.status_code}")
            return
            
        try:
            data = response.json()
        except json.JSONDecodeError:
            self.log_result("Plans Endpoint", False, "Response is not valid JSON")
            return
            
        # Check if plans data is present
        if "plans" not in data:
            self.log_result("Plans Endpoint", False, "No 'plans' key in response", data)
            return
            
        plans = data["plans"]
        if not isinstance(plans, list):
            self.log_result("Plans Endpoint", False, "Plans should be a list", data)
            return
            
        if len(plans) == 0:
            self.log_result("Plans Endpoint", False, "Plans list is empty", data)
            return
            
        # Check if plans have expected structure
        sample_plan = plans[0]
        expected_plan_fields = ["plan_id", "name", "price", "record_limit"]
        missing_plan_fields = []
        
        for field in expected_plan_fields:
            if field not in sample_plan:
                missing_plan_fields.append(field)
                
        if missing_plan_fields:
            self.log_result("Plans Endpoint", False, 
                          f"Plans missing expected fields: {missing_plan_fields}", sample_plan)
        else:
            self.log_result("Plans Endpoint", True, 
                          f"Plans list returned with {len(plans)} plans", 
                          {"plan_count": len(plans), "sample_plan": sample_plan})
    
    def test_backend_health(self):
        """Test basic backend connectivity"""
        success, response = self.make_request("GET", "/config")
        
        if not success:
            self.log_result("Backend Health", False, f"Backend unreachable: {response}")
            return
            
        self.log_result("Backend Health", True, f"Backend responding (status: {response.status_code})")
    
    def run_all_tests(self):
        """Run all test cases"""
        print("🚀 Starting Backend Tests for Telegram Bot Status and Public Endpoints")
        print("=" * 70)
        
        # Test backend connectivity first
        self.test_backend_health()
        
        # Test the specific endpoints mentioned in review request
        self.test_telegram_status()
        self.test_config_endpoint()
        self.test_plans_endpoint()
        
        # Print summary
        print("\n" + "=" * 70)
        print("📊 TEST SUMMARY")
        print("=" * 70)
        
        total_tests = len(self.results["passed"]) + len(self.results["failed"])
        passed_count = len(self.results["passed"])
        failed_count = len(self.results["failed"])
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_count}")
        print(f"❌ Failed: {failed_count}")
        
        if failed_count > 0:
            print(f"\n🔍 FAILED TESTS DETAILS:")
            for result in self.results["failed"]:
                print(f"  • {result['test']}: {result['message']}")
                if result.get('data'):
                    print(f"    Data: {result['data']}")
                    
        print(f"\n📝 DETAILED RESULTS:")
        for result in self.results["passed"] + self.results["failed"]:
            status = "✅" if result["test"] in [p["test"] for p in self.results["passed"]] else "❌"
            print(f"  {status} {result['test']}: {result['message']}")
            
        return failed_count == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed!")
        sys.exit(1)
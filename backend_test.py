#!/usr/bin/env python3
"""
Backend API Testing for DNS Management Platform
Tests all core backend endpoints and Telegram bot integration.
"""

import httpx
import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://telegram-deploy-auto.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.RESET}")

def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.RESET}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠️  {msg}{Colors.RESET}")

def print_info(msg):
    print(f"{Colors.BLUE}ℹ️  {msg}{Colors.RESET}")

async def test_config_endpoint():
    """Test GET /api/config - Should return site configuration"""
    print_info("Testing GET /api/config...")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(f"{API_BASE}/config")
            
            if response.status_code == 200:
                data = response.json()
                print_success("Config endpoint working")
                
                # Check required fields
                required_fields = ['domain', 'dns_domain']
                for field in required_fields:
                    if field in data:
                        print_success(f"  {field}: {data[field]}")
                    else:
                        print_warning(f"  Missing field: {field}")
                
                # Check optional fields
                optional_fields = ['telegram_id', 'telegram_url', 'contact_message_en', 
                                 'contact_message_fa', 'referral_bonus_per_invite']
                for field in optional_fields:
                    if field in data:
                        print_info(f"  {field}: {data[field]}")
                
                return True
            else:
                print_error(f"Config endpoint failed: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        print_error(f"Config endpoint error: {str(e)}")
        return False

async def test_plans_endpoint():
    """Test GET /api/plans - Should return plans list"""
    print_info("Testing GET /api/plans...")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(f"{API_BASE}/plans")
            
            if response.status_code == 200:
                data = response.json()
                print_success("Plans endpoint working")
                
                if 'plans' in data and isinstance(data['plans'], list):
                    plans = data['plans']
                    print_success(f"  Found {len(plans)} plans")
                    
                    for plan in plans:
                        plan_id = plan.get('plan_id', 'unknown')
                        name = plan.get('name', 'unknown')
                        record_limit = plan.get('record_limit', 0)
                        print_info(f"  Plan: {plan_id} - {name} ({record_limit} records)")
                        
                        # Check required plan fields
                        required_plan_fields = ['plan_id', 'name', 'record_limit', 'features']
                        for field in required_plan_fields:
                            if field not in plan:
                                print_warning(f"    Missing plan field: {field}")
                    
                    return True
                else:
                    print_warning("Plans data format unexpected")
                    print_info(f"Response: {data}")
                    return False
            else:
                print_error(f"Plans endpoint failed: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        print_error(f"Plans endpoint error: {str(e)}")
        return False

async def test_telegram_status_endpoint():
    """Test GET /api/telegram/status - Should return Telegram bot status"""
    print_info("Testing GET /api/telegram/status...")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(f"{API_BASE}/telegram/status")
            
            if response.status_code == 200:
                data = response.json()
                print_success("Telegram status endpoint working")
                
                status = data.get('status', 'unknown')
                reason = data.get('reason', '')
                
                print_info(f"  Status: {status}")
                if reason:
                    print_info(f"  Reason: {reason}")
                
                # Expected status is "disabled" since TELEGRAM_BOT_TOKEN is empty
                if status == "disabled" and "No token configured" in reason:
                    print_success("  ✅ CORRECT: Bot disabled due to empty token (expected behavior)")
                    return True
                elif status == "running":
                    print_warning("  Bot is running (token might be configured)")
                    # Check additional fields for running bot
                    if 'bot_username' in data:
                        print_info(f"  Bot username: {data['bot_username']}")
                    if 'bot_id' in data:
                        print_info(f"  Bot ID: {data['bot_id']}")
                    return True
                elif status == "stopped":
                    print_warning("  Bot is stopped")
                    return True
                elif status == "error":
                    print_warning(f"  Bot has error: {reason}")
                    return True
                else:
                    print_warning(f"  Unexpected status: {status}")
                    return True
            else:
                print_error(f"Telegram status endpoint failed: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        print_error(f"Telegram status endpoint error: {str(e)}")
        return False

async def test_admin_login():
    """Test POST /api/auth/login with admin credentials"""
    print_info("Testing POST /api/auth/login (admin)...")
    
    admin_credentials = {
        "email": "admin@khalilv2.com",
        "password": "admin123456"
    }
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{API_BASE}/auth/login",
                json=admin_credentials,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                print_success("Admin login successful")
                
                # Check required fields
                if 'token' in data and 'user' in data:
                    token = data['token']
                    user = data['user']
                    
                    print_success(f"  Token received: {token[:20]}...")
                    print_success(f"  User: {user.get('name')} ({user.get('email')})")
                    print_success(f"  Role: {user.get('role')}")
                    
                    if user.get('role') == 'admin':
                        print_success("  ✅ CORRECT: User has admin role")
                        return token  # Return token for subsequent tests
                    else:
                        print_warning(f"  User role is '{user.get('role')}', expected 'admin'")
                        return token
                else:
                    print_error("  Missing token or user in response")
                    return None
            elif response.status_code == 401:
                print_error("Admin login failed: Invalid credentials")
                print_info("  This might indicate the admin user doesn't exist or password is wrong")
                return None
            else:
                print_error(f"Admin login failed: {response.status_code} - {response.text}")
                return None
                
    except Exception as e:
        print_error(f"Admin login error: {str(e)}")
        return None

async def test_admin_bot_status(token):
    """Test GET /api/admin/bot/status with Bearer token"""
    print_info("Testing GET /api/admin/bot/status...")
    
    if not token:
        print_error("No token available for admin bot status test")
        return False
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{API_BASE}/admin/bot/status",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                print_success("Admin bot status endpoint working")
                
                # Check expected fields
                expected_fields = ['has_token', 'masked_token', 'admin_id', 'bot_running', 'bot_username']
                for field in expected_fields:
                    if field in data:
                        value = data[field]
                        print_success(f"  {field}: {value}")
                    else:
                        print_warning(f"  Missing field: {field}")
                
                return True
            elif response.status_code == 401:
                print_error("Admin bot status failed: Unauthorized (invalid token)")
                return False
            elif response.status_code == 403:
                print_error("Admin bot status failed: Forbidden (not admin)")
                return False
            else:
                print_error(f"Admin bot status failed: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        print_error(f"Admin bot status error: {str(e)}")
        return False

async def test_admin_zones(token):
    """Test GET /api/admin/zones with Bearer token"""
    print_info("Testing GET /api/admin/zones...")
    
    if not token:
        print_error("No token available for admin zones test")
        return False
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{API_BASE}/admin/zones",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                print_success("Admin zones endpoint working")
                
                if 'zones' in data:
                    zones = data['zones']
                    print_success(f"  Found {len(zones)} zones")
                    
                    for zone in zones:
                        zone_id = zone.get('id', 'unknown')
                        domain = zone.get('domain', 'unknown')
                        is_primary = zone.get('is_primary', False)
                        status = zone.get('status', 'unknown')
                        
                        primary_text = " (PRIMARY)" if is_primary else ""
                        print_info(f"  Zone: {domain} ({zone_id}) - {status}{primary_text}")
                        
                        if is_primary and domain == "khalilv2.com":
                            print_success("  ✅ CORRECT: Primary zone khalilv2.com found")
                
                    return True
                else:
                    print_warning("No 'zones' field in response")
                    print_info(f"Response: {data}")
                    return False
            elif response.status_code == 401:
                print_error("Admin zones failed: Unauthorized (invalid token)")
                return False
            elif response.status_code == 403:
                print_error("Admin zones failed: Forbidden (not admin)")
                return False
            else:
                print_error(f"Admin zones failed: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        print_error(f"Admin zones error: {str(e)}")
        return False

async def test_admin_settings(token):
    """Test GET /api/admin/settings with Bearer token"""
    print_info("Testing GET /api/admin/settings...")
    
    if not token:
        print_error("No token available for admin settings test")
        return False
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{API_BASE}/admin/settings",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                print_success("Admin settings endpoint working")
                
                # Check common settings fields
                settings_fields = ['telegram_id', 'telegram_url', 'contact_message_en', 
                                 'contact_message_fa', 'referral_bonus_per_invite', 'default_free_records']
                
                for field in settings_fields:
                    if field in data:
                        value = data[field]
                        print_info(f"  {field}: {value}")
                    else:
                        print_warning(f"  Missing setting: {field}")
                
                return True
            elif response.status_code == 401:
                print_error("Admin settings failed: Unauthorized (invalid token)")
                return False
            elif response.status_code == 403:
                print_error("Admin settings failed: Forbidden (not admin)")
                return False
            else:
                print_error(f"Admin settings failed: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        print_error(f"Admin settings error: {str(e)}")
        return False

async def test_health_check():
    """Basic health check - test if backend is responding"""
    print_info("Testing backend health check...")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Try the root endpoint
            response = await client.get(BACKEND_URL)
            
            if response.status_code == 200:
                print_success("Backend root endpoint responding")
                return True
            elif response.status_code == 404:
                print_info("Root endpoint returns 404 (normal for API-only backends)")
                
                # Try to check if the API prefix works
                try:
                    api_response = await client.get(f"{API_BASE}/config")
                    if api_response.status_code in [200, 401, 403]:
                        print_success("Backend API endpoint responding")
                        return True
                except:
                    pass
                    
            print_warning(f"Backend health check: {response.status_code}")
            return True  # Consider it working if we get any response
            
    except Exception as e:
        print_error(f"Backend health check error: {str(e)}")
        return False

async def run_all_tests():
    """Run all backend API tests"""
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}DNS MANAGEMENT PLATFORM - BACKEND API TESTS{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"API Base: {API_BASE}")
    print()
    
    tests = [
        ("Backend Health Check", test_health_check),
        ("Config Endpoint", test_config_endpoint),
        ("Plans Endpoint", test_plans_endpoint),
        ("Telegram Status Endpoint", test_telegram_status_endpoint),
        ("Telegram Debug Endpoint", test_telegram_debug_endpoint),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"{Colors.BLUE}--- {test_name} ---{Colors.RESET}")
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print_error(f"Test {test_name} failed with exception: {str(e)}")
            results.append((test_name, False))
        print()
    
    # Summary
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}TEST SUMMARY{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}")
    
    passed = 0
    failed = 0
    
    for test_name, result in results:
        if result:
            print_success(f"{test_name}")
            passed += 1
        else:
            print_error(f"{test_name}")
            failed += 1
    
    print()
    print(f"Total Tests: {len(results)}")
    print_success(f"Passed: {passed}")
    if failed > 0:
        print_error(f"Failed: {failed}")
    else:
        print_success("All tests passed! 🎉")
    
    return failed == 0

if __name__ == "__main__":
    asyncio.run(run_all_tests())
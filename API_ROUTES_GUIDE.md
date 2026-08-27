# 🚀 Food Rescue API - সম্পূর্ণ গাইড

এই ডকুমেন্টেশন অনুসরণ করে সব routes টেস্ট করতে পারবেন।

---

## 📋 প্রিপারেশন

### ১. সার্ভার শুরু করুন
```bash
npm run dev
```

### ২. Postman খুলুন এবং Collection Import করুন
- File → Import → `postman_collection.json` নির্বাচন করুন

### ৩. Environment সেটআপ করুন
- Top-left ⚙️ Settings → Environments → Create
- নাম: `Development`
- Variables:
  - `base_url` = `http://localhost:5000`
  - `token` = ` ` (পরে লগইনের পরে paste করবেন)

---

## 🔐 AUTH ROUTES (সব ব্যবহারকারীর জন্য)

### ✅ 1. Register - নতুন অ্যাকাউন্ট তৈরি করুন

**Method:** `POST`  
**URL:** `{{base_url}}/api/auth/register`  
**Authentication:** ❌ লাগে না

**Body (JSON):**
```json
{
  "name": "NGO User",
  "email": "ngo@example.com",
  "password": "password123",
  "phone": "01700000000",
  "role": "ngo",
  "organization_name": "Help NGO",
  "latitude": 23.8,
  "longitude": 90.4
}
```

**Role অপশন:**
- `ngo` - এনজিও হিসেবে রেজিস্টার করুন
- `restaurant` - রেস্তোরাঁ হিসেবে রেজিস্টার করুন
- `admin` - অ্যাডমিন হিসেবে রেজিস্টার করুন

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "NGO User",
    "email": "ngo@example.com",
    "role": "ngo"
  }
}
```

---

### ✅ 2. Login - লগইন করুন

**Method:** `POST`  
**URL:** `{{base_url}}/api/auth/login`  
**Authentication:** ❌ লাগে না

**Body (JSON):**
```json
{
  "email": "ngo@example.com",
  "password": "password123"
}
```

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "ngo@example.com",
    "role": "ngo"
  }
}
```

**⭐ গুরুত্বপূর্ণ:** Token কপি করুন এবং Environment-এ paste করুন:
1. Response-এ `token` এর মান কপি করুন
2. ⚙️ Environment খুলুন
3. `token` variable-এ paste করুন

---

### ✅ 3. Get Profile - আপনার প্রোফাইল দেখুন

**Method:** `GET`  
**URL:** `{{base_url}}/api/auth/profile`  
**Authentication:** ✅ Bearer Token দরকার

**Header:**
```
Authorization: Bearer {{token}}
```

**Body:** কিছু লাগবে না

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "NGO User",
    "email": "ngo@example.com",
    "role": "ngo",
    "organization_name": "Help NGO"
  }
}
```

---

### ✅ 4. Update Profile - প্রোফাইল আপডেট করুন

**Method:** `PUT`  
**URL:** `{{base_url}}/api/auth/profile`  
**Authentication:** ✅ Bearer Token দরকার

**Body (JSON):**
```json
{
  "name": "Updated Name",
  "phone": "01700000001",
  "address": "123 Street",
  "organization_name": "Updated NGO"
}
```

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "name": "Updated Name"
  }
}
```

---

### ✅ 5. Change Password - পাসওয়ার্ড পরিবর্তন করুন

**Method:** `POST`  
**URL:** `{{base_url}}/api/auth/change-password`  
**Authentication:** ✅ Bearer Token দরকার

**Body (JSON):**
```json
{
  "oldPassword": "password123",
  "newPassword": "newPassword456"
}
```

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

### ✅ 6. Forgot Password - পাসওয়ার্ড ভুলে গেছেন?

**Method:** `POST`  
**URL:** `{{base_url}}/api/auth/forgot-password`  
**Authentication:** ❌ লাগে না

**Body (JSON):**
```json
{
  "email": "ngo@example.com"
}
```

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "message": "Reset password email sent successfully"
}
```

---

### ✅ 7. Reset Password - পাসওয়ার্ড রিসেট করুন

**Method:** `POST`  
**URL:** `{{base_url}}/api/auth/reset-password`  
**Authentication:** ❌ লাগে না

**Body (JSON):**
```json
{
  "email": "ngo@example.com",
  "token": "reset_token_from_email",
  "newPassword": "newPassword456"
}
```

**⏱️ Token Validity:** ২৪ ঘন্টা (Reset link email পেওয়ার পর)

---

## 🍕 FOOD ROUTES (খাবার পোস্টিং)

### ✅ 1. List All Foods - সব খাবার দেখুন (সবার জন্য)

**Method:** `GET`  
**URL:** `{{base_url}}/api/foods?status=available&food_type=vegetarian`  
**Authentication:** ❌ লাগে না (অপশনাল)

**Query Parameters:**
- `status` = `available` / `requested` / `collected`
- `food_type` = `vegetarian` / `non-vegetarian` / `both`
- `search` = খাবারের নাম (অপশনাল)

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "count": 5,
  "foods": [
    {
      "id": 1,
      "food_name": "Biryani",
      "description": "Leftover biryani",
      "quantity": 15,
      "food_type": "non-vegetarian",
      "status": "available"
    }
  ]
}
```

---

### ✅ 2. Get Nearby Foods - কাছাকাছির খাবার দেখুন

**Method:** `GET`  
**URL:** `{{base_url}}/api/foods/nearby?lat=23.8&lon=90.4&radius=15`  
**Authentication:** ❌ লাগে না

**Query Parameters:**
- `lat` = অক্ষাংশ (উদা: 23.8) - **আবশ্যক**
- `lon` = দ্রাঘিমাংশ (উদা: 90.4) - **আবশ্যক**
- `radius` = দূরত্ব কিমি-তে (ডিফল্ট: 15)

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "count": 3,
  "foods": [
    {
      "id": 1,
      "food_name": "Biryani",
      "latitude": 23.81,
      "longitude": 90.41
    }
  ]
}
```

---

### ✅ 3. Get Food By ID - নির্দিষ্ট খাবার দেখুন

**Method:** `GET`  
**URL:** `{{base_url}}/api/foods/1`  
**Authentication:** ❌ লাগে না

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "food": {
    "id": 1,
    "food_name": "Biryani",
    "description": "Leftover biryani",
    "quantity": 15,
    "food_type": "non-vegetarian",
    "status": "available",
    "view_count": 5
  }
}
```

---

### ✅ 4. Create Food - নতুন খাবার পোস্ট করুন (শুধু Restaurant)

**Method:** `POST`  
**URL:** `{{base_url}}/api/foods`  
**Authentication:** ✅ Bearer Token দরকার  
**Role:** ✅ শুধুমাত্র Restaurant

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: multipart/form-data
```

**Body (Form Data):**
```
food_name: "Biryani" (text)
description: "Leftover biryani" (text)
quantity: "15" (text)
food_type: "non-vegetarian" (text)  
  ➜ অপশন: "vegetarian", "non-vegetarian", "both"
pickup_time: "14:00" (text)
pickup_date: "2026-08-28" (text)
image: [ফাইল নির্বাচন করুন] (file)
```

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "message": "Surplus food posted successfully",
  "food": {
    "id": 1,
    "food_name": "Biryani",
    "status": "available"
  }
}
```

---

### ✅ 5. Update Food - খাবার আপডেট করুন (শুধু সেই Restaurant)

**Method:** `PUT`  
**URL:** `{{base_url}}/api/foods/1`  
**Authentication:** ✅ Bearer Token দরকার  
**Role:** ✅ খাবার তৈরিকারী Restaurant অথবা Admin

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json (বা multipart/form-data যদি image যোগ করতে চান)
```

**Body (JSON):**
```json
{
  "food_name": "Updated Biryani",
  "quantity": "20",
  "description": "Updated description",
  "food_type": "both"
}
```

**⚠️ Error হলে:**
```json
{
  "success": false,
  "message": "Not authorized to update this food item"
}
```
**সমাধান:** আপনার তৈরি খাবারের ID ব্যবহার করুন এবং সঠিক token আছে কিনা চেক করুন।

---

### ✅ 6. Delete Food - খাবার ডিলিট করুন (শুধু সেই Restaurant)

**Method:** `DELETE`  
**URL:** `{{base_url}}/api/foods/1`  
**Authentication:** ✅ Bearer Token দরকার  
**Role:** ✅ খাবার তৈরিকারী Restaurant অথবা Admin

**Headers:**
```
Authorization: Bearer {{token}}
```

**Body:** কিছু লাগবে না

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "message": "Food posting deleted successfully"
}
```

---

## 📬 REQUEST ROUTES (খাবার রিকোয়েস্ট)

### ✅ 1. Create Request - খাবার চান (শুধু NGO)

**Method:** `POST`  
**URL:** `{{base_url}}/api/requests`  
**Authentication:** ✅ Bearer Token দরকার  
**Role:** ✅ শুধুমাত্র NGO

**Body (JSON):**
```json
{
  "food_id": 1,
  "request_message": "We need this food for our NGO",
  "collection_time": "14:30",
  "collection_date": "2026-08-28"
}
```

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "message": "Request submitted successfully",
  "request": {
    "id": 1,
    "food_id": 1,
    "ngo_id": 2,
    "status": "pending"
  }
}
```

---

### ✅ 2. Get My Requests - আমার রিকোয়েস্ট দেখুন (শুধু NGO)

**Method:** `GET`  
**URL:** `{{base_url}}/api/requests/my`  
**Authentication:** ✅ Bearer Token দরকার  
**Role:** ✅ শুধুমাত্র NGO

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "count": 3,
  "requests": [
    {
      "id": 1,
      "food_id": 1,
      "food_name": "Biryani",
      "status": "pending",
      "request_message": "We need this food"
    }
  ]
}
```

---

### ✅ 3. Approve Request - রিকোয়েস্ট মঞ্জুর করুন (শুধু Restaurant)

**Method:** `PUT`  
**URL:** `{{base_url}}/api/requests/1/approve`  
**Authentication:** ✅ Bearer Token দরকার  
**Role:** ✅ শুধুমাত্র সেই খাবারের Restaurant অথবা Admin

**Body (JSON):**
```json
{}
```

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "message": "Request approved successfully",
  "request": {
    "id": 1,
    "status": "approved"
  }
}
```

---

### ✅ 4. Reject Request - রিকোয়েস্ট বাতিল করুন (শুধু Restaurant)

**Method:** `PUT`  
**URL:** `{{base_url}}/api/requests/1/reject`  
**Authentication:** ✅ Bearer Token দরকার  
**Role:** ✅ শুধুমাত্র সেই খাবারের Restaurant অথবা Admin

**Body (JSON):**
```json
{}
```

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "message": "Request rejected",
  "request": {
    "id": 1,
    "status": "rejected"
  }
}
```

---

### ✅ 5. Collect Food - খাবার সংগ্রহ করুন (শুধু NGO)

**Method:** `PUT`  
**URL:** `{{base_url}}/api/requests/1/collect`  
**Authentication:** ✅ Bearer Token দরকার  
**Role:** ✅ শুধুমাত্র যে NGO রিকোয়েস্ট করেছে অথবা Admin

**Body (JSON):**
```json
{}
```

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "message": "Food item marked as collected!",
  "request": {
    "id": 1,
    "status": "collected"
  }
}
```

---

### ✅ 6. Get QR Code - QR কোড পান (শুধু NGO)

**Method:** `GET`  
**URL:** `{{base_url}}/api/requests/1/qr`  
**Authentication:** ✅ Bearer Token দরকার  
**Role:** ✅ শুধুমাত্র সেই রিকোয়েস্টের NGO অথবা Admin

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,iVBORw0KGgo...",
  "token": "qr_verification_token"
}
```

---

## 🔔 NOTIFICATION ROUTES

### ✅ 1. Get All Notifications - সব নোটিফিকেশন পান

**Method:** `GET`  
**URL:** `{{base_url}}/api/notifications`  
**Authentication:** ✅ Bearer Token দরকার

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "count": 5,
  "notifications": [
    {
      "id": 1,
      "title": "New Food Available",
      "message": "A new food item posted",
      "is_read": false
    }
  ]
}
```

---

### ✅ 2. Mark Notification as Read

**Method:** `PUT`  
**URL:** `{{base_url}}/api/notifications/read`  
**Authentication:** ✅ Bearer Token দরকার

**Body (JSON):**
```json
{
  "id": 1
}
```

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

### ✅ 3. Mark All Notifications as Read

**Method:** `PUT`  
**URL:** `{{base_url}}/api/notifications/read-all`  
**Authentication:** ✅ Bearer Token দরকার

**Body (JSON):**
```json
{}
```

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

## 💬 CHAT ROUTES

### ✅ 1. Get Chat History

**Method:** `GET`  
**URL:** `{{base_url}}/api/chat/2`  
**Authentication:** ✅ Bearer Token দরকার

**URL Parameters:**
- `2` = অন্য ব্যবহারকারীর ID যার সাথে চ্যাট করছেন

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "count": 3,
  "messages": [
    {
      "id": 1,
      "sender_id": 1,
      "receiver_id": 2,
      "message": "Hello!",
      "created_at": "2026-08-27T10:00:00"
    }
  ]
}
```

---

### ✅ 2. Send Message

**Method:** `POST`  
**URL:** `{{base_url}}/api/chat`  
**Authentication:** ✅ Bearer Token দরকার

**Body (JSON):**
```json
{
  "receiver_id": 2,
  "message": "Hello, how are you?"
}
```

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "message": {
    "id": 1,
    "sender_id": 1,
    "receiver_id": 2,
    "message": "Hello, how are you?"
  }
}
```

---

## 🎁 DONATION ROUTES

### ✅ 1. Get Donations

**Method:** `GET`  
**URL:** `{{base_url}}/api/donations`  
**Authentication:** ✅ Bearer Token দরকার

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "count": 5,
  "donations": [
    {
      "id": 1,
      "food_id": 1,
      "restaurant_id": 1,
      "ngo_id": 2,
      "quantity": 15,
      "status": "collected"
    }
  ]
}
```

---

### ✅ 2. Get Donation Stats

**Method:** `GET`  
**URL:** `{{base_url}}/api/donations/stats`  
**Authentication:** ✅ Bearer Token দরকার

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "stats": {
    "totalDonations": 25,
    "totalQuantity": 150,
    "totalRestaurants": 5,
    "totalNGOs": 3
  }
}
```

---

## 📄 REPORT ROUTES

### ✅ Download PDF Report

**Method:** `GET`  
**URL:** `{{base_url}}/api/reports/download`  
**Authentication:** ✅ Bearer Token দরকার

**প্রত্যাশিত Response:**
- PDF ফাইল ডাউনলোড হবে

---

## 👨‍💼 ADMIN ROUTES (শুধুমাত্র Admin)

### ✅ 1. Get Dashboard

**Method:** `GET`  
**URL:** `{{base_url}}/api/admin/dashboard`  
**Authentication:** ✅ Bearer Token দরকার  
**Role:** ✅ শুধুমাত্র Admin

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "dashboard": {
    "totalUsers": 10,
    "totalFoods": 25,
    "totalRequests": 15,
    "totalDonations": 12,
    "monthlyStats": []
  }
}
```

---

### ✅ 2. Get All Users

**Method:** `GET`  
**URL:** `{{base_url}}/api/admin/users?role=ngo`  
**Authentication:** ✅ Bearer Token দরকার  
**Role:** ✅ শুধুমাত্র Admin

**Query Parameters:**
- `role` = `ngo` / `restaurant` / `admin` (অপশনাল)

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "count": 5,
  "users": [
    {
      "id": 1,
      "name": "NGO User",
      "email": "ngo@example.com",
      "role": "ngo"
    }
  ]
}
```

---

### ✅ 3. Block User

**Method:** `PUT`  
**URL:** `{{base_url}}/api/admin/users/2/block`  
**Authentication:** ✅ Bearer Token দরকার  
**Role:** ✅ শুধুমাত্র Admin

**Body (JSON):**
```json
{}
```

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "message": "User deactivated/blocked",
  "user": {
    "id": 2,
    "is_active": false
  }
}
```

---

### ✅ 4. Unblock User

**Method:** `PUT`  
**URL:** `{{base_url}}/api/admin/users/2/unblock`  
**Authentication:** ✅ Bearer Token দরকার  
**Role:** ✅ শুধুমাত্র Admin

**Body (JSON):**
```json
{}
```

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "message": "User activated/unblocked",
  "user": {
    "id": 2,
    "is_active": true
  }
}
```

---

### ✅ 5. Get Reports

**Method:** `GET`  
**URL:** `{{base_url}}/api/admin/reports`  
**Authentication:** ✅ Bearer Token দরকার  
**Role:** ✅ শুধুমাত্র Admin

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "user_id": 1,
      "action": "USER_LOGIN",
      "timestamp": "2026-08-27T10:00:00"
    }
  ]
}
```

---

### ✅ 6. Get Stats

**Method:** `GET`  
**URL:** `{{base_url}}/api/admin/stats`  
**Authentication:** ✅ Bearer Token দরকার  
**Role:** ✅ শুধুমাত্র Admin

**প্রত্যাশিত Response:**
```json
{
  "success": true,
  "stats": {
    "foodStatus": [
      { "status": "available", "count": 10 },
      { "status": "collected", "count": 5 }
    ],
    "requestStatus": [
      { "status": "pending", "count": 3 },
      { "status": "approved", "count": 5 }
    ]
  }
}
```

---

## 📋 দ্রুত চেকলিস্ট

### ✅ NGO-র জন্য করতে পারে:
- [x] রেজিস্টার/লগইন
- [x] প্রোফাইল দেখা/আপডেট করা
- [x] খাবার লিস্ট দেখা
- [x] কাছাকাছির খাবার খুঁজা
- [x] খাবার চাওয়ার রিকোয়েস্ট করা
- [x] নিজের রিকোয়েস্ট দেখা
- [x] খাবার সংগ্রহ করা
- [x] QR কোড পাওয়া
- [x] চ্যাট করা
- [x] নোটিফিকেশন দেখা

### ✅ Restaurant-র জন্য করতে পারে:
- [x] রেজিস্টার/লগইন
- [x] প্রোফাইল দেখা/আপডেট করা
- [x] নতুন খাবার পোস্ট করা
- [x] খাবার আপডেট/ডিলিট করা
- [x] রিকোয়েস্ট মঞ্জুর/বাতিল করা
- [x] চ্যাট করা
- [x] নোটিফিকেশন দেখা
- [x] ডোনেশন স্ট্যাটিস্টিক্স দেখা

### ✅ Admin-র জন্য করতে পারে:
- [x] ড্যাশবোর্ড দেখা
- [x] সব ইউজার দেখা
- [x] ইউজার ব্লক/আনব্লক করা
- [x] রিপোর্ট দেখা
- [x] স্ট্যাটিস্টিক্স দেখা

---

## 🆘 সমস্যা সমাধান

### ❌ "Not authorized to access this route"
**সমাধান:** 
- সঠিক Role নিয়ে লগইন করুন
- Token সঠিক কিনা চেক করুন
- ⚙️ Environment-এ Token পেস্ট করা আছে কিনা চেক করুন

### ❌ "Invalid or expired token"
**সমাধান:**
- আবার লগইন করুন
- নতুন token কপি করুন
- Environment-এ পেস্ট করুন

### ❌ "Not authorized to update this food item"
**সমাধান:**
- শুধুমাত্র সেই খাবারের owner আপডেট করতে পারে
- আপনার তৈরি খাবারের ID ব্যবহার করুন

### ❌ "Food item is no longer available"
**সমাধান:**
- খাবারটি সংগ্রহ হয়ে গেছে বা স্ট্যাটাস চেঞ্জ হয়েছে
- অন্য খাবারের রিকোয়েস্ট করুন

---

## 🎯 পরবর্তী ধাপ

1. ✅ সার্ভার চালু করুন
2. ✅ Postman Import করুন
3. ✅ Register → Login করুন
4. ✅ Token সেভ করুন
5. ✅ প্রতিটি endpoint টেস্ট করুন
6. ✅ Error messages পড়ুন এবং বুঝুন

**Happy Testing! 🚀**

# Complete User Flow Test Guide
## From Registration to Hotel Booking

This guide will help you test the complete user journey from account creation to booking a hotel.

---

## 🎯 Test Scenario Overview

**Goal**: Test the complete flow from:
1. User Registration → 
2. Login → 
3. Guest Home Page → 
4. View Hotel Details → 
5. Complete Booking

---

## ✅ Pre-Test Setup

**Test Data Created:**
- ✅ Test Hotel: "Grand Safari Hotel" (ID: 1)
- ✅ Room Type: "Deluxe King Room" (ID: 1)
- ✅ Price: KSh 150/night

**Access Points:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/
- Hotel Page: http://localhost:3000/hotel/1

---

## 📋 Step-by-Step Test Process

### **Step 1: User Registration**

1. **Navigate to Registration Page**
   - Go to: http://localhost:3000/register
   - Or click "Sign Up" from the homepage

2. **Fill Registration Form**
   - First Name: `Test`
   - Last Name: `User`
   - Email: `testuser@example.com` (use a unique email)
   - Phone: `+254712345678`
   - Password: `testpass123`
   - Confirm Password: `testpass123`
   - **Role**: Select "Guest" (default)
   - Accept Terms & Conditions

3. **Submit Registration**
   - Click "Create Account"
   - **Expected**: 
     - ✅ Success message
     - ✅ Auto-login
     - ✅ Redirect to Guest Home Page (`/`)

4. **Verify Registration**
   - Check that you're logged in
   - Check that you're on the Guest Home Page (not Host Home)
   - Verify user info in header/profile

---

### **Step 2: Login (If Needed)**

*Skip if auto-logged in from registration*

1. **Navigate to Login Page**
   - Go to: http://localhost:3000/login
   - Or click "Log In" from header

2. **Enter Credentials**
   - Email: `testuser@example.com`
   - Password: `testpass123`

3. **Submit Login**
   - Click "Sign In"
   - **Expected**:
     - ✅ Success message
     - ✅ Redirect to Guest Home Page (`/`)
     - ✅ NOT redirected to Host Home Page

4. **Verify Login**
   - Check user is authenticated
   - Check active role is "guest"
   - Verify you're on Guest Home Page

---

### **Step 3: Navigate to Hotels**

1. **From Home Page**
   - Look for "Hotels" section or navigation
   - Click on "Hotels" or "Browse Hotels"
   - Or navigate directly to hotel listings

2. **View Hotel List**
   - **Expected**: See "Grand Safari Hotel" in the list
   - Hotel should show:
     - Name: Grand Safari Hotel
     - Location: Nairobi, Kenya
     - Star Rating: 5 stars
     - Property Type: Luxury Hotel

3. **Click on Hotel**
   - Click on "Grand Safari Hotel" card
   - **Expected**: Navigate to `/hotel/1`

---

### **Step 4: View Hotel Details**

1. **Hotel Information Display**
   - **Expected to See**:
     - ✅ Hotel name: "Grand Safari Hotel"
     - ✅ Star rating (5 stars)
     - ✅ Description
     - ✅ Location: "123 Safari Street, Nairobi, Kenya"
     - ✅ Contact information
     - ✅ Property details

2. **Room Types Section**
   - **Expected**: See "Deluxe King Room" available
   - Room should show:
     - Room name
     - Price: KSh 150/night
     - Capacity information

3. **Booking Form Visibility**
   - **Expected**: Booking form should be visible on the page
   - Form should include:
     - Room type selector
     - Check-in date picker
     - Check-out date picker
     - Adults count input
     - Children count input
     - "Book Now" button

---

### **Step 5: Complete Booking Process**

1. **Select Room Type**
   - From dropdown: Select "Deluxe King Room - KSh 150/night"
   - **Expected**: Room type is selected

2. **Select Dates**
   - **Check-in Date**: 
     - Click date picker
     - Select a future date (e.g., tomorrow)
     - **Expected**: Date is selected
   
   - **Check-out Date**:
     - Click date picker
     - Select a date AFTER check-in (e.g., 2 days later)
     - **Expected**: Date is selected and validated

3. **Enter Guest Count**
   - **Adults**: Enter `2` (or use default 1)
   - **Children**: Enter `0` (or leave default)
   - **Expected**: Numbers are accepted

4. **Validation Checks**
   - Try booking without dates → **Expected**: Error message
   - Try booking with check-out before check-in → **Expected**: Error message
   - Try booking with 0 adults → **Expected**: Error message

5. **Submit Booking**
   - Fill all required fields correctly
   - Click "Book Now" button
   - **Expected**:
     - ✅ Button shows "Processing..." while submitting
     - ✅ Success toast: "Booking created successfully!"
     - ✅ Redirect to booking detail page: `/booking/{booking_id}`

---

### **Step 6: Verify Booking**

1. **Booking Detail Page**
   - **Expected to See**:
     - ✅ Booking ID
     - ✅ Hotel name: "Grand Safari Hotel"
     - ✅ Room type: "Deluxe King Room"
     - ✅ Check-in date
     - ✅ Check-out date
     - ✅ Number of nights
     - ✅ Number of adults/children
     - ✅ Total amount (calculated)
     - ✅ Booking status: "Pending"
     - ✅ Payment status: "Unpaid"

2. **Booking Information**
   - Verify all details match what you entered
   - Check pricing calculation is correct
   - Verify guest information is pre-filled

---

## 🐛 Common Issues to Check

### **Registration Issues**
- ❌ User redirected to Host Home instead of Guest Home
- ❌ Registration fails with validation errors
- ❌ Auto-login doesn't work

### **Login Issues**
- ❌ User redirected to Host Home instead of Guest Home
- ❌ Login fails with wrong credentials
- ❌ Active role not set correctly

### **Hotel Display Issues**
- ❌ Hotel not showing in list
- ❌ Hotel details not loading
- ❌ Room types not displaying

### **Booking Issues**
- ❌ Booking form not visible
- ❌ Date validation not working
- ❌ Booking submission fails
- ❌ Error messages not clear
- ❌ Redirect to booking page fails

---

## ✅ Success Criteria

The flow is successful if:

1. ✅ User can register and is auto-logged in
2. ✅ User is redirected to Guest Home Page (not Host Home)
3. ✅ User can see hotels in the listing
4. ✅ User can view hotel details
5. ✅ Booking form is visible and functional
6. ✅ User can select dates and guest count
7. ✅ Validation works correctly
8. ✅ Booking is created successfully
9. ✅ User is redirected to booking detail page
10. ✅ Booking information is displayed correctly

---

## 🔧 Troubleshooting

### If hotel doesn't appear:
```bash
# Check if hotel exists
cd backend
source venv/bin/activate
python manage.py shell
>>> from apps.listings.models import Hotel
>>> Hotel.objects.all()
```

### If booking fails:
- Check browser console for errors
- Check backend logs for API errors
- Verify user is authenticated
- Check network tab for API responses

### If redirected to wrong page:
- Check user's active_role in Redux state
- Check localStorage for 'userActiveRole'
- Verify HomePage.js logic for role-based routing

---

## 📝 Test Notes

**Test Date**: _______________
**Tester**: _______________
**Browser**: _______________

**Issues Found**:
1. 
2. 
3. 

**Status**: ⬜ Pass / ⬜ Fail / ⬜ Partial

---

## 🚀 Next Steps After Testing

Once you've completed the test:
1. Report any bugs or issues
2. Note any UX improvements needed
3. Verify all success criteria are met
4. Test edge cases (invalid dates, etc.)

---

**Happy Testing! 🎉**


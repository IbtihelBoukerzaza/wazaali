# Testing Guide for Wazali App

## Image Upload Solution

I've implemented a **Base64 fallback** for images. If Firebase Storage doesn't work (free plan issue), images will be:
- Converted to Base64 strings
- Stored directly in Firestore
- Displayed normally in the app

**Note:** Base64 strings are larger than URLs, so Firestore storage limits may apply. For production, upgrade to Blaze plan for proper Storage.

---

## Testing Steps

### Step 1: Start the App

```bash
npm start
```

Press `a` for Android or `i` for iOS, or scan the QR code with Expo Go app.

**What should happen:**
- Splash screen appears with Wazali logo
- After 2.5 seconds, navigates to Login screen (if no user logged in)

---

### Step 2: Create Admin User (First Time Only)

Since the app requires admin approval, you need to create the first admin manually:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project "waze3li"
3. Go to **Authentication** > **Users**
4. Click **Add user**
5. Enter:
   - Email: `admin@wazali.com`
   - Password: `admin123`
6. Click **Add user**
7. Copy the UID (click on the user to see it)
8. Go to **Firestore Database**
9. Click **Start collection** > Name it `users`
10. Add a document with ID = the user's UID
11. Add these fields:
   ```
   uid: (paste the UID)
   name: "Admin"
   email: "admin@wazali.com"
   role: "admin"
   approved: true
   createdAt: (current timestamp)
   ```

**What should happen:**
- Admin user is created in Authentication
- Admin user data is stored in Firestore with `role: "admin"` and `approved: true`

---

### Step 3: Test Admin Login

1. In the app, on Login screen:
   - Email: `admin@wazali.com`
   - Password: `admin123`
2. Click "تسجيل الدخول"

**What should happen:**
- Login succeeds
- Navigates to Admin Dashboard
- Shows "حسابات قيد المراجعة (0)" initially
- Shows logout button in header

---

### Step 4: Test Shop Owner Signup

1. Go back to Login screen (logout if needed)
2. Click "ليس لديك حساب؟ أنشئ حساب جديد"
3. Select "صاحب محل" (Shop Owner)
4. Fill in:
   - Name: "Test Shop"
   - Email: "shop@wazali.com"
   - Password: "test123"
   - Confirm Password: "test123"
5. Accept terms checkbox
6. Click "إنشاء حساب"

**What should happen:**
- Account created successfully
- Alert shows: "تم إنشاء حسابك بنجاح. حسابك قيد المراجعة من قبل المسؤول"
- Redirects to Login screen
- User is logged out automatically

---

### Step 5: Admin Approves Shop Owner

1. Login as Admin again
2. You should see the pending shop owner request
3. Click "موافقة" (Approve) button

**What should happen:**
- Alert shows: "تمت الموافقة على الحساب بنجاح"
- User is removed from pending list
- Count decreases

---

### Step 6: Test Shop Owner Login

1. Login as the approved shop owner:
   - Email: `shop@wazali.com`
   - Password: `test123`

**What should happen:**
- Login succeeds
- Navigates to Shop Owner Navigator
- Shows 5 tabs: الرئيسية, المصانع, الخريطة, طلباتي, حسابي
- Active tab is "الرئيسية"

---

### Step 7: Test Factory Owner Signup

1. Logout
2. Go to Signup screen
3. Select "صاحب مصنع" (Factory Owner)
4. Fill in:
   - Name: "Test Factory"
   - Email: "factory@wazali.com"
   - Password: "test123"
   - Confirm Password: "test123"
5. Accept terms
6. Click "إنشاء حساب"

**What should happen:**
- Account created
- Alert shows approval message
- Redirects to Login

---

### Step 8: Admin Approves Factory Owner

1. Login as Admin
2. Approve the factory owner request

**What should happen:**
- Factory owner approved
- Removed from pending list

---

### Step 9: Test Factory Owner Login & Add Products

1. Login as Factory Owner:
   - Email: `factory@wazali.com`
   - Password: `test123"

**What should happen:**
- Login succeeds
- Navigates to Factory Owner Navigator
- Shows 4 tabs: الرئيسية, المنتجات, الطلبات, حسابي

2. Click "المنتجات" tab
3. Click "+" button in header

**What should happen:**
- Modal opens with "إضافة منتج جديد" title
- Shows image upload area
- Shows input fields for name, price, quantity, description

4. Fill in:
   - Name: "حليب كامل الدسم"
   - Price: "5"
   - Quantity: "100"
   - Description: "حليب طازج من المزرعة"
5. Click on image area to select an image (optional)
6. Click "حفظ"

**What should happen:**
- If Storage works: Image uploads to Firebase Storage
- If Storage fails: Image converts to Base64 and saves to Firestore
- Alert shows: "تم إضافة المنتج بنجاح"
- Modal closes
- Product appears in the list with image (if uploaded) or placeholder

7. Add 2-3 more products for testing

---

### Step 10: Test Product Management

1. Click edit button (pencil icon) on a product

**What should happen:**
- Modal opens with "تعديل المنتج" title
- Product data pre-filled
- Modify any field
- Click "حفظ"

**What should happen:**
- Alert shows: "تم تحديث المنتج بنجاح"
- Product updated in list

2. Click delete button (trash icon)

**What should happen:**
- Confirmation dialog appears
- Click "رفض" to cancel
- Click "حذف" to confirm
- Alert shows: "تم حذف المنتج بنجاح"
- Product removed from list

---

### Step 11: Test Shop Owner View Factories

1. Logout and login as Shop Owner
2. Click "المصانع" tab

**What should happen:**
- Shows list of approved factory owners
- Each factory shows name and role badge

---

### Step 12: Test Order Placement (Future Feature)

*Note: Order placement UI needs to be added to FactoriesScreen. This is a planned feature.*

Expected flow:
1. Shop owner clicks on a factory
2. Views factory's products
3. Selects products and quantities
4. Sees total price
5. Confirms order
6. Order appears in "طلباتي" tab with status "قيد الانتظار"

---

### Step 13: Test Factory Owner Order Management

1. Login as Factory Owner
2. Click "الطلبات" tab

**What should happen:**
- Shows incoming orders
- Each order shows shop name, items, total, status
- For pending orders: Shows "قبول" and "رفض" buttons
- For accepted orders: Shows "إكمال الطلب" button

3. Click "قبول" on a pending order

**What should happen:**
- Alert shows: "تم قبول الطلب بنجاح"
- Status changes to "مقبول"
- Button changes to "إكمال الطلب"

4. Click "إكمال الطلب"

**What should happen:**
- Alert shows: "تم إكمال الطلب بنجاح"
- Status changes to "مكتمل"

---

### Step 14: Test Shop Owner Order Tracking

1. Login as Shop Owner
2. Click "طلباتي" tab

**What should happen:**
- Shows all orders placed by this shop
- Each order shows:
  - Order ID
  - Factory name
  - Status with color badge
  - Date
  - Total price
3. Click on an order

**What should happen:**
- Modal opens with order details
- Shows all items with quantities and prices
- Shows total

---

## Common Issues & Solutions

### Issue: "حساب قيد المراجعة" alert on login
**Solution:** The account hasn't been approved by admin yet. Login as admin and approve it.

### Issue: Navigation shows wrong screens
**Solution:** Check that the user's `role` field in Firestore is correct (admin, shop_owner, or factory_owner)

### Issue: Products don't save
**Solution:** Check Firestore Database is enabled and rules allow read/write

### Issue: Images don't upload
**Solution:** The Base64 fallback should work. Check console for errors. If Base64 fails, product saves without image.

### Issue: Orders don't appear
**Solution:** Ensure both shop and factory owners are approved, and orders have correct `shopId` and `factoryId`

---

## Testing Checklist

- [ ] Admin user created manually in Firebase Console
- [ ] Admin can login and see dashboard
- [ ] Shop owner can signup
- [ ] Admin can approve shop owner
- [ ] Approved shop owner can login
- [ ] Factory owner can signup
- [ ] Admin can approve factory owner
- [ ] Approved factory owner can login
- [ ] Factory owner can add products
- [ ] Factory owner can edit products
- [ ] Factory owner can delete products
- [ ] Shop owner can view factories
- [ ] Orders can be created (when UI is added)
- [ ] Factory owner can accept/reject orders
- [ ] Factory owner can complete orders
- [ ] Shop owner can view order history
- [ ] Real-time order updates work

---

## Next Steps After Testing

1. **Add order placement UI** to FactoriesScreen for shop owners to browse and order products
2. **Add location features** to MapScreen for nearby factories
3. **Implement push notifications** for order alerts
4. **Add payment integration** for orders
5. **Improve error handling** and user feedback
6. **Add loading states** for better UX

# Testing Booking Changes Dialog - Step by Step Guide

## Overview
The booking changes dialog appears on the **Customer's page (My Tours)** when a travel agent edits their booking. The customer must approve or decline the changes.

## 🎯 What Was Fixed

### 1. **Dialog Not Showing Issue**
   - **Problem**: Customer couldn't see the changes dialog
   - **Solution**: Added a mock booking with `changeRequestStatus: 'PENDING'` in the mock data
   - **Location**: `src/pages/MyToursPage.tsx` - Booking ID '2' now has PENDING status

### 2. **Meal Plan Dropdown**
   - **Status**: ✅ Already working correctly
   - **Location**: `src/components/EditBookingModal.tsx` lines 357-368
   - The dropdown shows: Breakfast (BB), Half-board (HB), Full-board (FB), All inclusive (AI)

### 3. **Change Detection**
   - **Fixed**: The system now properly compares original vs updated booking data
   - **Shows changes** for: Number of tourists, Meal plan, Start date

---

## 📋 How to Test Locally

### **Option 1: Using Mock Data (Easiest)**

1. **Open Customer Page (My Tours)**
   ```
   Navigate to: http://localhost:5173/my-tours
   ```

2. **You Should See:**
   - A dialog box appears immediately on page load
   - Title: "Confirm tour booking changes"
   - Shows booking: "Jungle Villa" on "Feb 20, 2025 (10 days)"
   - Lists 3 changes:
     * Number of tourists: Johnson Doe (1 adult) → Johnson Doe (2 adults)
     * Meal plan: Breakfast (BB) → Half-board (HB)
     * Start date: Feb 15, 2025 (7 days) → Feb 20, 2025 (10 days)

3. **Test the Dialog Buttons:**
   
   **Decline Changes:**
   - Click "Decline changes" button
   - Dialog closes
   - Booking reverts to original state (no PENDING status)
   
   **Confirm Changes:**
   - Click "Confirm changes" button
   - Dialog closes
   - Green success notification appears: "Booking changes confirmed successfully"
   - Booking status changes to APPROVED

4. **Reload the Page:**
   - If you declined: Dialog won't appear again
   - If you confirmed: Dialog won't appear again (approved)

---

### **Option 2: Full Testing with Travel Agent Flow**

This tests the complete workflow between Travel Agent and Customer.

#### **Step 1: Go to Travel Agent Page**
```
Navigate to: http://localhost:5173/travel-agent-bookings
```

#### **Step 2: Edit a Booking**
1. Find any booking with status "BOOKED"
2. Click the **"Edit"** button
3. Edit modal opens - Make changes:
   - Change **Date/Duration** using the dropdown
   - Change **Number of guests** using +/- buttons
   - Change **Meal plan** using the dropdown
   - Modify **Customer names** if needed
4. Click **"Save changes"**
5. Modal closes
6. The booking now has a **disabled "Check and confirm" button** with tooltip

#### **Step 3: Go to Customer Page**
```
Navigate to: http://localhost:5173/my-tours
```

#### **Step 4: Verify Dialog Appears**
1. The **"Confirm tour booking changes"** dialog should appear automatically
2. Verify it shows:
   - The correct tour name
   - The updated date
   - A bulleted list of all changes made
3. You have 2 options:
   - **Decline changes**: Reverts booking to original
   - **Confirm changes**: Approves the updates

---

## 🔍 Visual Checks

### **Dialog Appearance:**
- ✅ White background with rounded corners
- ✅ Max width: 420px
- ✅ Centered on screen
- ✅ Semi-transparent dark overlay behind it
- ✅ Close button (X) in top-right
- ✅ Title: "Confirm tour booking changes"

### **Content:**
- ✅ Booking name and date in bold
- ✅ "Changes:" heading
- ✅ Bulleted list of modifications
- ✅ Helper text about other details remaining the same

### **Buttons:**
- ✅ "Decline changes" - White background, blue border
- ✅ "Confirm changes" - Blue background, white text
- ✅ Both buttons aligned to the right

---

## 🐛 Troubleshooting

### **Dialog Not Appearing?**

**Check 1:** Verify mock data
```typescript
// In src/pages/MyToursPage.tsx, line ~60-80
// Look for booking ID '2' and verify it has:
changeRequestStatus: 'PENDING'
```

**Check 2:** Open Browser Console (F12)
```javascript
// Check for any errors in the Console tab
// Look for React errors or API failures
```

**Check 3:** Check Browser Network Tab
```
1. Open DevTools (F12)
2. Go to "Network" tab
3. Refresh page
4. Look for any failed requests (red)
```

### **Meal Dropdown Not Working?**

**Verify the dropdown exists:**
1. Click "Edit" on any booking
2. Look for the meal plan dropdown with fork/knife icon
3. Click it - should show 4 options:
   - Breakfast (BB)
   - Half-board (HB)
   - Full-board (FB)
   - All inclusive (AI)

**If still not working:**
- Check `src/components/EditBookingModal.tsx` lines 357-368
- Verify `mealPlan` state exists
- Verify `mealOptions` array is populated

---

## 📝 Expected Behavior Summary

| Action | Expected Result |
|--------|----------------|
| Customer opens My Tours page | Dialog appears if booking has `changeRequestStatus: 'PENDING'` |
| Customer clicks "Decline changes" | Dialog closes, booking reverts, no PENDING status |
| Customer clicks "Confirm changes" | Dialog closes, success message appears, status = APPROVED |
| Customer refreshes page after confirming | Dialog does NOT appear again |
| Travel agent edits booking | "Check and confirm" button becomes disabled with tooltip |
| Travel agent views after customer confirms | Button becomes enabled (APPROVED status) |

---

## 🎨 UI/UX Notes

1. **Dialog is modal** - User must interact with it (can't click outside easily)
2. **Auto-appears on page load** - No manual trigger needed
3. **One-time interaction** - Once confirmed/declined, won't show again for that booking
4. **Mobile responsive** - Dialog scales down on smaller screens

---

## ✅ Testing Checklist

- [ ] Dialog appears on My Tours page load
- [ ] Shows correct booking name and date
- [ ] Lists all changes made by travel agent
- [ ] "Decline changes" button works
- [ ] "Confirm changes" button works
- [ ] Success notification appears after confirm
- [ ] Dialog doesn't reappear after action
- [ ] Meal plan dropdown works in edit modal
- [ ] Guest stepper (+/-) works in edit modal
- [ ] Date/duration dropdown works in edit modal

---

## 🔧 Quick Fix Commands

If you need to reset the mock data:

```bash
# Reload the page
Ctrl + R (Windows) or Cmd + R (Mac)

# Hard reload (clears cache)
Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)
```

If TypeScript errors appear:

```bash
# In your terminal
npm run build
# or
npm run dev
```

---

## 📞 Need Help?

If the dialog still doesn't appear or meal dropdown doesn't work:

1. **Check the exact URL** you're visiting
2. **Verify you're logged in** as a customer (not travel agent)
3. **Look for JavaScript errors** in browser console (F12)
4. **Check if mock data** is being used (look for `useMockData` prop)
5. **Ensure the dev server is running** (`npm run dev`)

---

## 🎉 Success Indicators

You'll know everything is working when:

✅ Dialog appears immediately on customer page load  
✅ Shows "Jungle Villa" booking with 3 listed changes  
✅ Confirm button closes dialog and shows green success toast  
✅ Meal dropdown in edit modal shows all 4 meal options  
✅ Guest stepper allows changing number of adults/children  
✅ No console errors in browser DevTools  

**Happy Testing! 🚀**

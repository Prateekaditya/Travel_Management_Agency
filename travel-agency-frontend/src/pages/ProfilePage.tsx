import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { getUserProfile, updateUserName as apiUpdateUserName, updateUserPassword, changeUserEmail, UserProfile } from '../api/users';

type ProfileTab = 'general' | 'password' | 'email';

export default function ProfilePage() {
  const { auth, updateUserName } = useAuth();
  const { setRoute } = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>('general');
  const [isEditing, setIsEditing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Email change state
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [newEmailError, setNewEmailError] = useState('');
  const [confirmEmailError, setConfirmEmailError] = useState('');
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState('');

  // Load user profile on mount
  useEffect(() => {
    if (!auth?.userId) {
      setLoading(false);
      return;
    }

    getUserProfile(auth.userId)
      .then(profile => {
        setUserProfile(profile);
        setFirstName(profile.firstName);
        setLastName(profile.lastName);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load profile:', err);
        // Use auth data as fallback
        const nameParts = auth?.userName?.split(' ') || ['', ''];
        setFirstName(nameParts[0] || 'John');
        setLastName(nameParts[1] || 'Doe');
        setLoading(false);
      });
  }, [auth?.userId, auth?.userName, auth?.email]);

  // Password validation
  const passwordValidation = useMemo(() => {
    const password = newPassword;
    return {
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
      hasValidLength: password.length >= 8 && password.length <= 16,
      passwordsMatch: confirmPassword.length > 0 && confirmPassword === password,
      get canSubmit() {
        return (
          oldPassword.length > 0 &&
          /[A-Z]/.test(password) &&
          /[a-z]/.test(password) &&
          /\d/.test(password) &&
          /[^A-Za-z0-9]/.test(password) &&
          password.length >= 8 &&
          password.length <= 16 &&
          confirmPassword === password
        )
      }
    };
  }, [oldPassword, newPassword, confirmPassword]);

  const validateName = (name: string, field: 'first' | 'last') => {
    const latinLettersHyphensApostrophes = /^[a-zA-Z'-]+$/;
    
    if (!name || name.trim() === '') {
      return `${field === 'first' ? 'First' : 'Last'} name is required`;
    }
    
    if (name.length > 50) {
      return `${field === 'first' ? 'First' : 'Last'} name must be up to 50 characters. Only Latin letters, hyphens, and apostrophes are allowed.`;
    }
    
    if (!latinLettersHyphensApostrophes.test(name)) {
      return `${field === 'first' ? 'First' : 'Last'} name must be up to 50 characters. Only Latin letters, hyphens, and apostrophes are allowed.`;
    }
    
    return '';
  };

  const handleSave = async () => {
    const firstError = validateName(firstName, 'first');
    const lastError = validateName(lastName, 'last');
    
    setFirstNameError(firstError);
    setLastNameError(lastError);
    
    if (!firstError && !lastError && auth?.userId) {
      try {
        await apiUpdateUserName(auth.userId, { firstName, lastName });
        
        // Update auth context with new name
        updateUserName(firstName, lastName);
        
        setIsEditing(false);
        setSuccessMessage('Your account has been updated successfully.');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
        
        // Refresh profile data
        const updatedProfile = await getUserProfile(auth.userId);
        setUserProfile(updatedProfile);
      } catch (err) {
        setFirstNameError(err instanceof Error ? err.message : 'Failed to update name');
      }
    }
  };

  const handlePasswordChange = async () => {
    if (passwordValidation.canSubmit && auth?.userId) {
      try {
        await updateUserPassword(auth.userId, {
          currentPassword: oldPassword,
          newPassword: newPassword,
        });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSuccessMessage('Your password has been changed successfully.');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to change password');
      }
    }
  };

  const handleEmailChange = async () => {
    const emailRegex = /^[a-zA-Z][a-zA-Z0-9._%+\-]{0,63}@[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]?)*\.[a-zA-Z]{2,}$/;
    
    let hasError = false;
    
    if (!newEmail || !emailRegex.test(newEmail)) {
      setNewEmailError('Invalid email address. Please ensure it follows the format: username@domain.com');
      hasError = true;
    } else {
      setNewEmailError('');
    }
    
    if (newEmail !== confirmEmail) {
      setConfirmEmailError('Emails don\'t match.');
      hasError = true;
    } else {
      setConfirmEmailError('');
    }
    
    if (!hasError && currentPassword && auth?.userId) {
      try {
        await changeUserEmail(auth.userId, {
          newEmail,
          password: currentPassword,
        });
        setConfirmedEmail(newEmail);
        setShowEmailConfirmation(true);
        // Clear form fields
        setNewEmail('');
        setConfirmEmail('');
        setCurrentPassword('');
      } catch (err) {
        setNewEmailError(err instanceof Error ? err.message : 'Failed to change email');
      }
    }
  };

  const handleCancel = () => {
    setFirstName(userProfile?.firstName || '');
    setLastName(userProfile?.lastName || '');
    setFirstNameError('');
    setLastNameError('');
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#E7F9FF', paddingTop: '24px', paddingBottom: '48px' }}>
        <div className="max-w-6xl mx-auto px-6">
          <h1 
            style={{ 
              fontFamily: 'Nunito, sans-serif', 
              fontWeight: 700, 
              fontSize: '28px', 
              color: '#0B3857',
              marginBottom: '24px'
            }}
          >
            My profile
          </h1>
          <div className="bg-white rounded-xl p-8 text-center">
            <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: '15px', color: '#677883' }}>
              Loading profile...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#E7F9FF', paddingTop: '24px', paddingBottom: '48px', position: 'relative' }}>
      <div className="max-w-6xl mx-auto px-6">
        {/* Success Notification */}
        {showSuccess && (
          <div
            style={{
              position: 'fixed',
              top: '88px',
              right: '24px',
              zIndex: 50,
              backgroundColor: '#EDFFEE',
              border: '1px solid #118819',
              borderRadius: '4px',
              padding: '12px',
              display: 'flex',
              alignItems: 'start',
              gap: '12px',
              minWidth: '320px',
              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: '2px' }}>
              <circle cx="10" cy="10" r="10" fill="#118819"/>
              <path d="M5.5 10.5l3 3 6-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '14px', color: '#118819', margin: 0, marginBottom: '2px' }}>
                Success
              </p>
              <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: '14px', color: '#0B3857', margin: 0 }}>
                {successMessage}
              </p>
            </div>
            <button 
              onClick={() => setShowSuccess(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Page Title */}
        <h1 
          style={{ 
            fontFamily: 'Nunito, sans-serif', 
            fontWeight: 700, 
            fontSize: '28px', 
            color: '#0B3857',
            marginBottom: '24px'
          }}
        >
          My profile
        </h1>

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <div className="col-span-12 md:col-span-3">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setActiveTab('general')}
                  style={{
                    width: '75%',
                    padding: '0',
                    paddingBottom: '8px',
                    textAlign: 'left',
                    fontFamily: 'Nunito, sans-serif',
                    fontWeight: activeTab === 'general' ? 700 : 400,
                    fontSize: '15px',
                    color: activeTab === 'general' ? '#0B3857' : '#677883',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'color 0.15s ease'
                  }}
                >
                  General information
                </button>
                {activeTab === 'general' && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '75%',
                    height: '3px',
                    backgroundColor: '#027EAC',
                    borderRadius: '2px'
                  }} />
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setActiveTab('password')}
                  style={{
                    width: '75%',
                    padding: '0',
                    paddingBottom: '8px',
                    textAlign: 'left',
                    fontFamily: 'Nunito, sans-serif',
                    fontWeight: activeTab === 'password' ? 700 : 400,
                    fontSize: '15px',
                    color: activeTab === 'password' ? '#0B3857' : '#677883',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'color 0.15s ease'
                  }}
                >
                  Change password
                </button>
                {activeTab === 'password' && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '75%',
                    height: '3px',
                    backgroundColor: '#027EAC',
                    borderRadius: '2px'
                  }} />
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setActiveTab('email')}
                  style={{
                    width: '75%',
                    padding: '0',
                    paddingBottom: '8px',
                    textAlign: 'left',
                    fontFamily: 'Nunito, sans-serif',
                    fontWeight: activeTab === 'email' ? 700 : 400,
                    fontSize: '15px',
                    color: activeTab === 'email' ? '#0B3857' : '#677883',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'color 0.15s ease'
                  }}
                >
                  Change email
                </button>
                {activeTab === 'email' && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '75%',
                    height: '3px',
                    backgroundColor: '#027EAC',
                    borderRadius: '2px'
                  }} />
                )}
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="col-span-12 md:col-span-9">
            {activeTab === 'general' && (
              <div 
                style={{ 
                  backgroundColor: '#FFFFFF', 
                  borderRadius: '12px',
                  padding: '32px',
                  boxShadow: '0px 2px 8px rgba(2, 126, 172, 0.15)',
                  width:"70%"
                }}
              >
                {/* Header with Edit Button */}
                <div className="flex items-center justify-between mb-8">
                  <h2 
                    style={{ 
                      fontFamily: 'Nunito, sans-serif', 
                      fontWeight: 700, 
                      fontSize: '24px', 
                      color: '#0B3857',
                      margin: 0
                    }}
                  >
                    General information
                  </h2>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                    aria-label="Edit profile"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.166 2.5009C14.3849 2.28203 14.6447 2.10842 14.9307 1.98996C15.2167 1.87151 15.5232 1.81055 15.8327 1.81055C16.1422 1.81055 16.4487 1.87151 16.7347 1.98996C17.0206 2.10842 17.2805 2.28203 17.4993 2.5009C17.7182 2.71977 17.8918 2.97961 18.0103 3.26558C18.1287 3.55154 18.1897 3.85804 18.1897 4.16757C18.1897 4.4771 18.1287 4.7836 18.0103 5.06956C17.8918 5.35553 17.7182 5.61537 17.4993 5.83424L6.24935 17.0842L1.66602 18.3342L2.91602 13.7509L14.166 2.5009Z" stroke="#027EAC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                {/* Profile Content */}
                <div className="flex justify-center items-start  gap-10 ">
                  {/* Profile Picture */}
                  <div className="relative flex-shrink-0">
                    <div 
                      style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        backgroundColor: '#A2AEB9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        top:"-10px"
                      }}
                    >
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 20C18 18.4087 17.3679 16.8826 16.2426 15.7574C15.1174 14.6321 13.5913 14 12 14C10.4087 14 8.88258 14.6321 7.75736 15.7574C6.63214 16.8826 6 18.4087 6 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 14C14.2091 14 16 12.2091 16 10C16 7.79086 14.2091 6 12 6C9.79086 6 8 7.79086 8 10C8 12.2091 9.79086 14 12 14Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      
                      {/* Edit Photo Button */}
                      <button
                        style={{
                          position: 'absolute',
                          bottom: '4px',
                          right: '4px',
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#027EAC',
                          border: '3px solid white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        aria-label="Edit photo"
                      >
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14.166 2.5009C14.3849 2.28203 14.6447 2.10842 14.9307 1.98996C15.2167 1.87151 15.5232 1.81055 15.8327 1.81055C16.1422 1.81055 16.4487 1.87151 16.7347 1.98996C17.0206 2.10842 17.2805 2.28203 17.4993 2.5009C17.7182 2.71977 17.8918 2.97961 18.0103 3.26558C18.1287 3.55154 18.1897 3.85804 18.1897 4.16757C18.1897 4.4771 18.1287 4.7836 18.0103 5.06956C17.8918 5.35553 17.7182 5.61537 17.4993 5.83424L6.24935 17.0842L1.66602 18.3342L2.91602 13.7509L14.166 2.5009Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Profile Information */}
                  <div className="flex-1">
                    {!isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{
                            fontFamily: 'Nunito, sans-serif',
                            fontWeight: 800,
                            fontSize: '14px',
                            color: '#0B3857',
                            width: '100px',
                          }}>
                            First name:
                          </span>
                          <span style={{
                            fontFamily: 'Nunito, sans-serif',
                            fontSize: '14px',
                            color: '#0B3857'
                          }}>
                            {userProfile?.firstName || firstName}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{
                            fontFamily: 'Nunito, sans-serif',
                            fontWeight: 800,
                            fontSize: '14px',
                            color: '#0B3857',
                            width: '100px',
                          }}>
                            Last name:
                          </span>
                          <span style={{
                            fontFamily: 'Nunito, sans-serif',
                            fontSize: '14px',
                            color: '#0B3857'
                          }}>
                            {userProfile?.lastName || lastName}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* First Name */}
                        <div>
                          <label 
                            style={{
                              display: 'block',
                              fontFamily: 'Nunito, sans-serif',
                              fontWeight: 800,
                              fontSize: '14px',
                              color: '#0B3857',
                              marginBottom: '8px'
                            }}
                          >
                            First name
                          </label>
                          <input
                            type="text"
                            value={firstName}
                            onChange={(e) => {
                              setFirstName(e.target.value);
                              if (firstNameError) setFirstNameError('');
                            }}
                            placeholder="e.g. Johnson"
                            style={{
                              width: '100%',
                              maxWidth: '480px',
                              padding: '10px 14px',
                              fontFamily: 'Nunito, sans-serif',
                              fontSize: '15px',
                              color: '#0B3857',
                              border: firstNameError ? '1px solid #DC2626' : '1px solid #D3E1ED',
                              borderRadius: '8px',
                              outline: 'none'
                            }}
                          />
                          {firstNameError && (
                            <p style={{
                              fontFamily: 'Nunito, sans-serif',
                              fontSize: '12px',
                              color: '#DC2626',
                              margin: '4px 0 0 0'
                            }}>
                              {firstNameError}
                            </p>
                          )}
                        </div>

                        {/* Last Name */}
                        <div>
                          <label 
                            style={{
                              display: 'block',
                              fontFamily: 'Nunito, sans-serif',
                              fontWeight: 800,
                              fontSize: '14px',
                              color: '#0B3857',
                              marginBottom: '8px'
                            }}
                          >
                            Last name
                          </label>
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => {
                              setLastName(e.target.value);
                              if (lastNameError) setLastNameError('');
                            }}
                            placeholder="e.g. Doe"
                            style={{
                              width: '100%',
                              maxWidth: '480px',
                              padding: '10px 14px',
                              fontFamily: 'Nunito, sans-serif',
                              fontSize: '15px',
                              color: '#0B3857',
                              border: lastNameError ? '1px solid #DC2626' : '1px solid #D3E1ED',
                              borderRadius: '8px',
                              outline: 'none'
                            }}
                          />
                          {lastNameError && (
                            <p style={{
                              fontFamily: 'Nunito, sans-serif',
                              fontSize: '12px',
                              color: '#DC2626',
                              margin: '4px 0 0 0'
                            }}>
                              {lastNameError}
                            </p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                          <button
                            onClick={handleCancel}
                            style={{
                              padding: '10px 24px',
                              fontFamily: 'Nunito, sans-serif',
                              fontWeight: 700,
                              fontSize: '14px',
                              color: '#027EAC',
                              backgroundColor: '#FFFFFF',
                              border: '1.5px solid #027EAC',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E7F9FF'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSave}
                            style={{
                              padding: '10px 24px',
                              fontFamily: 'Nunito, sans-serif',
                              fontWeight: 700,
                              fontSize: '14px',
                              color: '#FFFFFF',
                              backgroundColor: '#027EAC',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'opacity 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            Save changes
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'password' && (
              <div 
                style={{ 
                  backgroundColor: '#FFFFFF', 
                  borderRadius: '12px',
                  padding: '32px',
                  boxShadow: '0px 2px 8px rgba(2, 126, 172, 0.15)',
                  width:"60%"
                }}
              >
                <h2 
                  style={{ 
                    fontFamily: 'Nunito, sans-serif', 
                    fontWeight: 700, 
                    fontSize: '24px', 
                    color: '#0B3857',
                    marginBottom: '24px'
                  }}
                >
                  Change password
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Old Password */}
                  <div>
                    <label 
                      style={{
                        display: 'block',
                        fontFamily: 'Nunito, sans-serif',
                        fontWeight: 800,
                        fontSize: '14px',
                        color: '#0B3857',
                        marginBottom: '8px'
                      }}
                    >
                      Old password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showOldPassword ? 'text' : 'password'}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        style={{
                          width: '100%',
                          maxWidth: '480px',
                          padding: '10px 40px 10px 14px',
                          fontFamily: 'Nunito, sans-serif',
                          fontSize: '15px',
                          color: '#0B3857',
                          border: '1px solid #D3E1ED',
                          borderRadius: '8px',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {showOldPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                            <path d="M3 3l18 18" />
                            <path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-4.4" />
                            <path d="M9.4 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17.2 17.2 0 0 1-4.1 4.8" />
                            <path d="M6.2 6.2A17.7 17.7 0 0 0 2 12s3.5 7 10 7a10.8 10.8 0 0 0 2.1-.2" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label 
                      style={{
                        display: 'block',
                        fontFamily: 'Nunito, sans-serif',
                        fontWeight: 800,
                        fontSize: '14px',
                        color: '#0B3857',
                        marginBottom: '8px'
                      }}
                    >
                      New password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter your new password"
                        autoComplete="new-password"
                        style={{
                          width: '100%',
                          maxWidth: '480px',
                          padding: '10px 40px 10px 14px',
                          fontFamily: 'Nunito, sans-serif',
                          fontSize: '15px',
                          color: '#0B3857',
                          border: '1px solid #D3E1ED',
                          borderRadius: '8px',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {showNewPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                            <path d="M3 3l18 18" />
                            <path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-4.4" />
                            <path d="M9.4 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17.2 17.2 0 0 1-4.1 4.8" />
                            <path d="M6.2 6.2A17.7 17.7 0 0 0 2 12s3.5 7 10 7a10.8 10.8 0 0 0 2.1-.2" />
                          </svg>
                        )}
                      </button>
                    </div>
                    
                    {/* Password Rules */}
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {[
                        { label: 'At least one uppercase letter required', valid: passwordValidation.hasUppercase },
                        { label: 'At least one lowercase letter required', valid: passwordValidation.hasLowercase },
                        { label: 'At least one number required', valid: passwordValidation.hasNumber },
                        { label: 'At least one special character required', valid: passwordValidation.hasSpecial },
                        { label: 'Password must be 8-16 characters long', valid: passwordValidation.hasValidLength },
                      ].map((rule, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: rule.valid ? '#118819' : '#6B7280',
                            flexShrink: 0
                          }} />
                          <span style={{
                            fontFamily: 'Nunito, sans-serif',
                            fontSize: '13px',
                            color: rule.valid ? '#118819' : '#6B7280'
                          }}>
                            {rule.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label 
                      style={{
                        display: 'block',
                        fontFamily: 'Nunito, sans-serif',
                        fontWeight: 800,
                        fontSize: '14px',
                        color: '#0B3857',
                        marginBottom: '8px'
                      }}
                    >
                      Confirm password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your new password"
                        autoComplete="new-password"
                        style={{
                          width: '100%',
                          maxWidth: '480px',
                          padding: '10px 40px 10px 14px',
                          fontFamily: 'Nunito, sans-serif',
                          fontSize: '15px',
                          color: '#0B3857',
                          border: !passwordValidation.passwordsMatch && confirmPassword.length > 0 ? '1px solid #DC2626' : '1px solid #D3E1ED',
                          borderRadius: '8px',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {showConfirmPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                            <path d="M3 3l18 18" />
                            <path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-4.4" />
                            <path d="M9.4 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17.2 17.2 0 0 1-4.1 4.8" />
                            <path d="M6.2 6.2A17.7 17.7 0 0 0 2 12s3.5 7 10 7a10.8 10.8 0 0 0 2.1-.2" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: passwordValidation.passwordsMatch ? '#118819' : '#6B7280',
                        flexShrink: 0
                      }} />
                      <span style={{
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: '13px',
                        color: passwordValidation.passwordsMatch ? '#118819' : '#6B7280'
                      }}>
                        Confirm password must match new password
                      </span>
                    </div>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handlePasswordChange}
                    disabled={!passwordValidation.canSubmit}
                    style={{
                      alignSelf: 'flex-end',
                      marginTop: '8px',
                      padding: '10px 24px',
                      fontFamily: 'Nunito, sans-serif',
                      fontWeight: 700,
                      fontSize: '14px',
                      color: '#FFFFFF',
                      backgroundColor: passwordValidation.canSubmit ? '#027EAC' : '#A2AEB9',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: passwordValidation.canSubmit ? 'pointer' : 'not-allowed',
                      transition: 'opacity 0.15s ease'
                    }}
                    onMouseEnter={(e) => passwordValidation.canSubmit && (e.currentTarget.style.opacity = '0.9')}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    Save changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'email' && (
              <div 
                style={{ 
                  backgroundColor: '#FFFFFF', 
                  borderRadius: '12px',
                  padding: '32px',
                  boxShadow: '0px 2px 8px rgba(2, 126, 172, 0.15)',
                  width:"60%"
                }}
              >
                <h2 
                  style={{ 
                    fontFamily: 'Nunito, sans-serif', 
                    fontWeight: 700, 
                    fontSize: '24px', 
                    color: '#0B3857',
                    marginBottom: '24px'
                  }}
                >
                  Change email
                </h2>

                {showEmailConfirmation ? (
                  <div>
                    <p
                      style={{
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: '15px',
                        color: '#0B3857',
                        lineHeight: '1.6',
                        margin: 0
                      }}
                    >
                      We sent an email to{' '}
                      <span style={{ color: '#027EAC' }}>({confirmedEmail})</span> with a
                      confirmation link. Please follow the instructions in the email.
                    </p>
                  </div>
                ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Current Email */}
                  <div>
                    <span style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontWeight: 800,
                      fontSize: '14px',
                      color: '#0B3857',
                      marginRight: '8px'
                    }}>
                      Current email:
                    </span>
                    <span style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontSize: '14px',
                      color: '#0B3857'
                    }}>
                      {auth?.email || 'johnsondoe@nomail.com'}
                    </span>
                  </div>

                  {/* New Email */}
                  <div>
                    <label 
                      style={{
                        display: 'block',
                        fontFamily: 'Nunito, sans-serif',
                        fontWeight: 800,
                        fontSize: '14px',
                        color: '#0B3857',
                        marginBottom: '8px'
                      }}
                    >
                      New email
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => {
                        setNewEmail(e.target.value);
                        if (newEmailError) setNewEmailError('');
                      }}
                      placeholder="e.g. username@domain.com"
                      style={{
                        width: '100%',
                        maxWidth: '480px',
                        padding: '10px 14px',
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: '15px',
                        color: '#0B3857',
                        border: newEmailError ? '1px solid #DC2626' : '1px solid #D3E1ED',
                        borderRadius: '8px',
                        outline: 'none'
                      }}
                    />
                    {newEmailError && (
                      <p style={{
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: '12px',
                        color: '#DC2626',
                        margin: '4px 0 0 0'
                      }}>
                        {newEmailError}
                      </p>
                    )}
                  </div>

                  {/* Confirm New Email */}
                  <div>
                    <label 
                      style={{
                        display: 'block',
                        fontFamily: 'Nunito, sans-serif',
                        fontWeight: 800,
                        fontSize: '14px',
                        color: '#0B3857',
                        marginBottom: '8px'
                      }}
                    >
                      Confirm new email
                    </label>
                    <input
                      type="email"
                      value={confirmEmail}
                      onChange={(e) => {
                        setConfirmEmail(e.target.value);
                        if (confirmEmailError) setConfirmEmailError('');
                      }}
                      placeholder="e.g. username@domain.com"
                      autoComplete="off"
                      style={{
                        width: '100%',
                        maxWidth: '480px',
                        padding: '10px 14px',
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: '15px',
                        color: '#0B3857',
                        border: confirmEmailError ? '1px solid #DC2626' : '1px solid #D3E1ED',
                        borderRadius: '8px',
                        outline: 'none'
                      }}
                    />
                    {confirmEmailError && (
                      <p style={{
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: '12px',
                        color: '#DC2626',
                        margin: '4px 0 0 0'
                      }}>
                        {confirmEmailError}
                      </p>
                    )}
                  </div>

                  {/* Current Password */}
                  <div>
                    <label 
                      style={{
                        display: 'block',
                        fontFamily: 'Nunito, sans-serif',
                        fontWeight: 800,
                        fontSize: '14px',
                        color: '#0B3857',
                        marginBottom: '8px'
                      }}
                    >
                      Current password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your password"
                        autoComplete="new-password"
                        style={{
                          width: '100%',
                          maxWidth: '480px',
                          padding: '10px 40px 10px 14px',
                          fontFamily: 'Nunito, sans-serif',
                          fontSize: '15px',
                          color: '#0B3857',
                          border: '1px solid #D3E1ED',
                          borderRadius: '8px',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {showCurrentPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                            <path d="M3 3l18 18" />
                            <path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-4.4" />
                            <path d="M9.4 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17.2 17.2 0 0 1-4.1 4.8" />
                            <path d="M6.2 6.2A17.7 17.7 0 0 0 2 12s3.5 7 10 7a10.8 10.8 0 0 0 2.1-.2" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Button */}
                  <button
                    onClick={handleEmailChange}
                    disabled={!newEmail || !confirmEmail || !currentPassword}
                    style={{
                      alignSelf: 'flex-end',
                      marginTop: '8px',
                      padding: '10px 24px',
                      fontFamily: 'Nunito, sans-serif',
                      fontWeight: 700,
                      fontSize: '14px',
                      color: '#FFFFFF',
                      backgroundColor: (newEmail && confirmEmail && currentPassword) ? '#027EAC' : '#A2AEB9',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: (newEmail && confirmEmail && currentPassword) ? 'pointer' : 'not-allowed',
                      transition: 'opacity 0.15s ease'
                    }}
                    onMouseEnter={(e) => (newEmail && confirmEmail && currentPassword) && (e.currentTarget.style.opacity = '0.9')}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    Confirm
                  </button>
                </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

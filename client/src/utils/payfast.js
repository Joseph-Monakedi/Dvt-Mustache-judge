import { apiUrl } from './api';

/**
 * Initiates PayFast checkout by creating a payment intent and submitting
 * a signed HTML form directly to PayFast.
 * 
 * @param {Object} options
 * @param {string} options.itemType - "Leaderboard" | "Quiz" | "Combo"
 * @param {string} options.token - User's JWT authorization token
 * @param {string} [options.returnPath] - Relative path to return after payment (default: '/dashboard?payment=success')
 * @param {string} [options.cancelPath] - Relative path if user cancels (default: '/dashboard?payment=cancelled')
 */
export async function initiatePayFastCheckout({
  itemType = 'Combo',
  token,
  returnPath = '/dashboard?payment=success',
  cancelPath = '/dashboard?payment=cancelled'
}) {
  if (!token) {
    throw new Error('You must be signed in to make a payment.');
  }

  const origin = window.location.origin;
  const returnUrl = `${origin}${returnPath.startsWith('/') ? returnPath : `/${returnPath}`}`;
  const cancelUrl = `${origin}${cancelPath.startsWith('/') ? cancelPath : `/${cancelPath}`}`;

  // 1. Call backend to generate signed PayFast payment payload
  const res = await fetch(apiUrl('/api/payfast/create-payment'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      itemType,
      returnUrl,
      cancelUrl
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to initiate PayFast checkout.');
  }

  const data = await res.json();
  const { processUrl, fields, reference } = data;

  if (!processUrl || !fields) {
    throw new Error('Invalid payment configuration received from server.');
  }

  // Save reference for immediate client confirmation upon return
  try {
    sessionStorage.setItem('dvt_last_payfast_ref', reference);
    sessionStorage.setItem('dvt_last_payfast_item', itemType);
    localStorage.setItem('dvt_last_payfast_ref', reference);
    localStorage.setItem('dvt_last_payfast_item', itemType);
    localStorage.setItem('dvt_last_payfast_time', Date.now().toString());
  } catch (e) {
    // ignore storage errors
  }

  // 2. Build and submit standard PayFast HTML Form
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = processUrl;
  form.style.display = 'none';

  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(value);
      form.appendChild(input);
    }
  });

  document.body.appendChild(form);
  form.submit();
}

/**
 * Confirms payment with the backend upon return from PayFast.
 */
export async function confirmPayFastReturn({ reference, itemType, pfPaymentId, token }) {
  if (!token) return null;

  const res = await fetch(apiUrl('/api/payfast/confirm-return'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      reference,
      itemType,
      pfPaymentId
    })
  });

  if (!res.ok) {
    throw new Error('Failed to confirm PayFast payment status.');
  }

  return await res.json();
}

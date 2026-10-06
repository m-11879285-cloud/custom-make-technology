const accountLink = document.getElementById('account-link');
const accountName = document.getElementById('account-name');
const accountAvatar = document.getElementById('account-avatar');

fetch('https://harukisensei.infy.click/account.php', {
  headers: { Accept: 'application/json' },
  cache: 'no-store',
  credentials: 'include'
})
  .then(async (response) => {
    const account = await response.json();

    if (response.status === 401 && account.authenticated === false) {
      return;
    }

    if (!response.ok) {
      throw new Error(`Account request failed (${response.status}).`);
    }

    if (
      account.authenticated !== true ||
      typeof account.username !== 'string' ||
      !account.username.trim()
    ) {
      throw new Error('Account response did not include a username.');
    }

    const username = account.username.trim();
    accountName.textContent = username;
    accountAvatar.textContent = Array.from(username)[0];
    accountLink.removeAttribute('href');
    accountLink.removeAttribute('aria-label');
  })
  .catch((error) => {
    accountName.textContent = 'Akaun tidak tersedia';
    accountLink.setAttribute('aria-label', 'Akaun tidak tersedia. Buka halaman log masuk.');
    console.error('Unable to load the signed-in account.', error);
  });

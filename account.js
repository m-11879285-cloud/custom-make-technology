const accountLink = document.getElementById('account-link');
const accountName = document.getElementById('account-name');
const accountAvatar = document.getElementById('account-avatar');

const accountParams = new URLSearchParams(window.location.hash.slice(1));
const username = accountParams.get('account')?.trim();

if (username) {
  accountName.textContent = username;
  accountAvatar.textContent = Array.from(username)[0];
  accountLink.removeAttribute('href');
  history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
}

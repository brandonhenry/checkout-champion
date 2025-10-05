window.addEventListener('DOMContentLoaded', () => {
  const versionEl = document.getElementById('version');
  if (versionEl && window.appInfo) {
    versionEl.textContent = window.appInfo.version;
  }

  const primary = document.getElementById('primary');
  const secondary = document.getElementById('secondary');

  primary?.addEventListener('click', () => {
    primary.textContent = 'You\'re set!';
  });

  secondary?.addEventListener('click', () => {
    alert('This starter is ready. Open renderer files and start coding.');
  });
});



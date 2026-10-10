const menu = document.querySelector('.mobile-menu');
if (menu) {
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) menu.open = false;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!menu.contains(event.target)) menu.open = false;
  });
}
const year = document.querySelector('#year');
if (year) year.textContent = String(new Date().getFullYear());

const hardwarePreorderLink = document.getElementById('hardware-preorder-link');

if (hardwarePreorderLink) {
  const isMobileDevice =
    window.matchMedia('(pointer: coarse)').matches ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobileDevice) {
    hardwarePreorderLink.href = hardwarePreorderLink.dataset.mobileHref;
    hardwarePreorderLink.removeAttribute('target');
    hardwarePreorderLink.removeAttribute('rel');
  } else {
    hardwarePreorderLink.href = hardwarePreorderLink.dataset.desktopHref;
  }
}

document.querySelector('#login').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target,
    button = form.querySelector('button');
  button.disabled = true;
  document.querySelector('#error').textContent = '';
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.elements.username.value,
        password: form.elements.password.value,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    location.href = '/admin/';
  } catch (error) {
    document.querySelector('#error').textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

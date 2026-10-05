document.addEventListener('click', (e) => {
  // Semak jika pengguna klik pada butang "Continue to payment"
  const target = e.target.closest('button');
  if (!target) return;
  
  if (target.innerText.includes('Continue to payment') || target.innerText.includes('Submit')) {
    // Ambil data daripada borang berdasarkan input sebenar
    const inputs = document.querySelectorAll('input');
    let fullName = 'Test User';
    let email = 'test@email.com';
    
    inputs.forEach(input => {
      if (input.value && input.value.includes('@')) email = input.value;
      else if (input.value && input.value.length > 2 && !input.value.includes('@') && !/^\d+$/.test(input.value)) {
        fullName = input.value;
      }
    });

    // Ambil kaedah pembayaran yang dipilih
    const selectedBox = document.querySelector('.option-box.selected');
    const selectedPayment = selectedBox ? selectedBox.innerText.trim() : 'Visa / Mastercard';

    const orderData = {
      customer: {
        fullName: fullName,
        email: email
      },
      total: "$12.00",
      paymentMethod: selectedPayment,
      items: [{ name: "Custom Cap", price: "$12.00" }]
    };

    // Hantar menggunakan kaedah borang tersembunyi (Bebas CORS!)
    if (window.CHECKOUT_CONFIG && window.CHECKOUT_CONFIG.orderApiUrl) {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = window.CHECKOUT_CONFIG.orderApiUrl;
      form.target = 'hidden_iframe';

      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'data';
      input.value = JSON.stringify(orderData);

      form.appendChild(input);
      
      if (!document.getElementById('hidden_iframe')) {
        const iframe = document.createElement('iframe');
        iframe.name = 'hidden_iframe';
        iframe.id = 'hidden_iframe';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
      }

      document.body.appendChild(form);
      form.submit();
      form.remove();
    }
  }
});
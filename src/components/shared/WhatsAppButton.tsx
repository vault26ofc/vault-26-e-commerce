export default function WhatsAppButton({ number = '919999999999' }: { number?: string }) {
  const msg = encodeURIComponent('Greetings Vault 26. I require assistance with...');
  return (
    <a 
      href={`https://wa.me/${number}?text=${msg}`} 
      target="_blank" 
      rel="noopener noreferrer"
      className="fixed bottom-24 lg:bottom-10 right-6 z-[100] h-14 w-14 rounded-full bg-black text-white shadow-2xl flex items-center justify-center hover:scale-110 transition-all duration-500 group border border-white/10"
      aria-label="WhatsApp Assistance"
    >
      <div className="absolute inset-0 rounded-full bg-accent opacity-0 group-hover:opacity-20 blur-xl transition-opacity" />
      <svg viewBox="0 0 24 24" className="h-6 w-6 relative z-10" fill="currentColor">
        <path d="M20.52 3.48A11.78 11.78 0 0 0 12.06 0C5.5 0 .15 5.34.15 11.9c0 2.1.55 4.14 1.6 5.94L0 24l6.32-1.66a11.9 11.9 0 0 0 5.74 1.46h.01c6.55 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.45-8.42zM12.07 21.8a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.75.98 1-3.66-.24-.38a9.86 9.86 0 0 1-1.51-5.25c0-5.46 4.45-9.9 9.91-9.9 2.65 0 5.13 1.03 7 2.9a9.84 9.84 0 0 1 2.9 7c0 5.46-4.45 9.9-9.91 9.9zm5.43-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.03 1-1.03 2.45 0 1.45 1.05 2.84 1.2 3.04.15.2 2.07 3.16 5.02 4.43.7.3 1.25.48 1.68.62.7.22 1.34.19 1.85.12.56-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z"/>
      </svg>
      <div className="absolute -top-12 right-0 bg-black text-white text-[9px] px-3 py-1.5 tracking-[0.2em] uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10">
        Concierge
      </div>
    </a>
  );
}


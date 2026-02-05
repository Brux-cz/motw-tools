# Security Improvements

## API Key Management

### Development Mode
- API klíč je nyní uložen v `.env` souboru na serveru (proxy-server.js)
- Frontend NEPOSÍLÁ API klíč v development módu
- Proxy server čte klíč ze `process.env.ANTHROPIC_API_KEY`

### Setup Instructions
1. Zkopírujte `.env.example` na `.env`
2. Vyplňte váš Anthropic API klíč
3. Ujistěte se, že `.env` je v `.gitignore` (už je)
4. Restartujte proxy server: `npm run proxy`

### Production Mode
⚠️ **DŮLEŽITÉ**: Před production deploymentem:
- NIKDY necommitujte .env soubor do git
- API klíč musí být uložen jako environment variable na produkčním serveru
- Frontend v production módu stále používá localStorage (DOČASNÉ ŘEŠENÍ)
- **Doporučení**: Implementujte backend API, který bude zprostředkovávat komunikaci s Anthropic API

### Security Features Implemented
✅ API klíč v environment variables (server-side)
✅ CORS whitelist (localhost only v dev módu)
✅ Request body validation
✅ Model whitelist (povolené pouze konkrétní modely)
✅ Max tokens limit (4096)
✅ Request size limit (1MB)
✅ Reduced error message verbosity
✅ XSS protection (event delegation místo inline onclick)

### Remaining Security TODOs
- [ ] Implementovat rate limiting na proxy serveru
- [ ] Přesunout API klíč z localStorage v production módu do backend service
- [ ] Implementovat token refresh mechanism
- [ ] Přidat request logging pro audit
- [ ] Implementovat HTTPS v production

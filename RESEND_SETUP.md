# Resend setup – booking confirmation emails

Resend sends clients a confirmation email when they complete a booking. Follow these steps.

---

## 1. Get your Resend API key

1. Go to **[resend.com](https://resend.com)** and sign in (e.g. your Hillwebworks / Pro account).
2. In the left sidebar, click **API Keys**.
3. Click **Create API Key**.
4. Give it a name (e.g. `Maya booking site`), leave permissions as **Sending access**, then click **Add**.
5. **Copy the key** (it starts with `re_`). You won’t see it again.

---

## 2. Add the key to your project

Open your **`.env`** file in the project root and set:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
```

Replace `re_...` with the key you copied. Save the file.

**That’s enough to send emails.** They will come from Resend’s default address (`onboarding@resend.dev`) until you add a custom domain (step 3).

---

## 3. (Optional) Use your own domain for “From” address

To send from something like `bookings@mayasite.com` or `noreply@yourdomain.com`:

1. In Resend, go to **Domains** in the sidebar.
2. Click **Add domain**.
3. Enter your domain (e.g. `yourdomain.com`), then follow the instructions.
4. Resend will show **DNS records** (SPF, DKIM, etc.). You must add these wherever your domain’s DNS is managed (see below).
5. Wait until the domain shows **Verified** in Resend (can take a few minutes to 48 hours).
6. Set the “from” address in your **local** `.env` and in **Vercel** (see step 4):

```env
RESEND_FROM=Maya African Hair Braiding <bookings@yourdomain.com>
```

Use any address at that domain (e.g. `bookings@`, `confirm@`, `noreply@`).

### Adding the DNS records

DNS is managed **wherever your domain lives**. You have two common cases:

**Option A – Domain is on Vercel**

If the site’s domain is added to your Vercel project (e.g. `mayasite.com` or `www.mayasite.com`):

1. In **Vercel**: open your project → **Settings** → **Domains**.
2. Click the domain you use for the Maya site (or add it if needed).
3. For that domain, click **Edit** / **Manage** or open the DNS/nameservers section. If Vercel shows **“DNS Records”** or **“Nameservers”**, you can add records here.
4. In **Resend**, on the domain page, copy each DNS record (Type, Name, Value). In Vercel, add a new record for each:
   - **Type**: e.g. `TXT` or `CNAME` (exactly as Resend shows).
   - **Name**: the host/subdomain Resend gives (e.g. `resend._domainkey` or `@`).
   - **Value**: the value Resend gives (long string for DKIM, etc.).
5. Save in Vercel. Back in Resend, wait until status turns **Verified** (use “Verify” if Resend has that button).

**Option B – Domain is elsewhere (GoDaddy, Cloudflare, Namecheap, etc.)**

Add the same records there:

1. Log in to where your domain’s DNS is managed (e.g. GoDaddy → DNS Management, Cloudflare → DNS, Namecheap → Advanced DNS).
2. From Resend’s domain page, copy each required record (Type, Name/Host, Value).
3. Create a new record in your DNS provider with that Type, Name, and Value. Repeat for every record Resend lists.
4. Save. In Resend, wait until the domain shows **Verified**.

**Important:** The records must be added at the **DNS provider for that domain**. If the domain is only “pointed” to Vercel (e.g. A record to Vercel’s IP) but DNS is still managed at GoDaddy/Cloudflare/etc., add the Resend records there, not in Vercel.

---

## 4. Set env vars in Vercel (for the live site)

So the **deployed** site can send confirmation emails:

1. In **Vercel**, open your project → **Settings** → **Environment Variables**.
2. Add:
   - **Name:** `RESEND_API_KEY`  
     **Value:** your `re_...` key  
   - **Name:** `RESEND_FROM` (optional; use this if you verified a domain in step 3)  
     **Value:** e.g. `Maya African Hair Braiding <bookings@yourdomain.com>`
3. Choose the environments (Production, Preview) and save.
4. **Redeploy** the project (Deployments → ⋮ on latest → Redeploy) so the new variables are used.

---

## 5. Test it

### Test offline (no payment, no server)

From the project root, send one test email using your real Resend config (`.env` is loaded automatically):

```bash
node scripts/test-resend-email.js your@email.com
```

Replace `your@email.com` with the inbox where you want the test. Check that inbox (and spam) for the confirmation email.

You can also set `TEST_EMAIL=your@email.com` in `.env` and run:

```bash
node scripts/test-resend-email.js
```

### Test on localhost (full booking flow)

You can use either **Python (Flask)** or **Vercel dev**:

**Option A – Python (Flask) – `app.py`**

1. Install Python deps (includes Resend): `pip install -r requirements.txt`
2. Set in `.env`: `SITE_URL=http://localhost:5500` (or leave as-is; Flask uses port 5500).
3. Start the app: `python app.py`
4. Open **http://localhost:5500**, do a test booking with your email, complete the deposit (e.g. Stripe test card `4242 4242 4242 4242`).
5. After payment, the confirmation email is sent by Flask. Check your inbox (and spam).

**Option B – Vercel dev (Node API)**

1. **Install Vercel CLI** (one-time): `npm i -g vercel` or use `npx vercel dev` without installing.
2. **Set your local URL in `.env`**: `SITE_URL=http://localhost:3000` (use the port `vercel dev` shows).
3. **Start the app:** `npx vercel dev` → open the URL it prints (e.g. **http://localhost:3000**).
4. Do a test booking; after payment, the Node API sends the email.

Your `.env` is loaded by both Flask and `vercel dev`, so `RESEND_API_KEY` and `RESEND_FROM` are used automatically.

### Test with a real booking (live site)

1. Make sure `npm install` has been run (so the `resend` package is installed).
2. Do a **test booking** on the live site: pick a style, date, and use **your own email** so you receive the confirmation.
3. Complete the deposit payment.
4. Check your inbox (and spam) for the “Booking confirmed — Maya African Hair Braiding” email.

If no email arrives:

- Confirm `RESEND_API_KEY` is set correctly in `.env` (and in Vercel if you deploy there).
- Check Resend **Logs** (sidebar) for errors or bounces.
- The booking still saves either way; only the email is skipped if Resend isn’t configured.

---

## Quick reference

| Item            | Where / What |
|-----------------|--------------|
| API key         | Resend → API Keys → Create → copy `re_...` |
| `.env`          | `RESEND_API_KEY=re_...` (required) |
| Custom “From”   | Resend → Domains → Add & verify → then `RESEND_FROM=Name <email@domain.com>` |
| Email template  | `api/emails/maya-booking-confirmation.html` (edit text/styling there) |

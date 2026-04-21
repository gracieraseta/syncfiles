import nodemailer from 'nodemailer'

// Configure avec ton email Gmail
// Va sur https://myaccount.google.com/apppasswords pour créer un mot de passe d'application
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'TON_EMAIL@gmail.com',      // Remplace par ton email
    pass: 'TON_MOT_DE_PASSE_APP'      // Mot de passe d'application Gmail
  }
})

export async function sendResetEmail(
  email: string,
  nom:   string,
  token: string
): Promise<boolean> {
  try {
    const resetLink = `syncfiles://reset-password?token=${token}`

    await transporter.sendMail({
      from:    '"SyncFiles" <TON_EMAIL@gmail.com>',
      to:      email,
      subject: 'Réinitialisation de votre mot de passe SyncFiles',
      html: `
        <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:32px;">
            <div style="width:36px; height:36px; background:#2563EB; border-radius:8px;
              display:flex; align-items:center; justify-content:center;">
              <span style="color:#fff; font-size:18px;">→</span>
            </div>
            <span style="font-size:18px; font-weight:600; color:#1A1917;">SyncFiles</span>
          </div>

          <h2 style="font-size:20px; font-weight:600; color:#1A1917; margin-bottom:8px;">
            Réinitialisation du mot de passe
          </h2>
          <p style="font-size:14px; color:#6B6963; margin-bottom:24px;">
            Bonjour <strong>${nom}</strong>,<br/>
            Vous avez demandé la réinitialisation de votre mot de passe.
            Ce lien est valable pendant <strong>30 minutes</strong>.
          </p>

          <a href="${resetLink}"
            style="display:inline-block; background:#2563EB; color:#fff;
              text-decoration:none; padding:12px 24px; border-radius:8px;
              font-size:14px; font-weight:500; margin-bottom:24px;">
            Réinitialiser mon mot de passe
          </a>

          <p style="font-size:12px; color:#A09B94;">
            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.<br/>
            Votre mot de passe ne sera pas modifié.
          </p>

          <hr style="border:none; border-top:1px solid #F0EEE9; margin:24px 0;"/>
          <p style="font-size:11px; color:#A09B94;">
            SyncFiles — Synchronisation de fichiers intelligente
          </p>
        </div>
      `
    })

    return true
  } catch (err) {
    console.error('Erreur envoi email :', err)
    return false
  }
}
/**
 * Lead-Erfassung Endpoint
 * Ermöglicht Kunden, direkt im Chat eine Offerte anzufordern
 */

import { onRequest } from 'firebase-functions/v2/https';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import cors from 'cors';
import { CONFIG } from './config';
import { getInsurerName } from './insurer-names';
import { validateApiKey } from './index';

// Supabase lazy initialization
let supabase: any = null;
function getSupabase() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

// Resend lazy initialization
let resend: Resend | null = null;
function getResend() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY || '';
    if (!apiKey) {
      console.error('RESEND_API_KEY not configured');
      return null;
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

// CORS Setup
const corsHandler = cors({
  origin: true,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key']
});

// Validate Email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Lead Interface
interface LeadInput {
  email: string;
  name: string;
  phone?: string;
  insurer_id: string;
  insurer_name?: string;
  monthly_premium_chf: number;
  canton: string;
  age_band: string;
  franchise_chf: number;
  model_type?: string;
  accident_covered?: boolean;
  message?: string;
}

// Generate Email HTML
function generateEmailHtml(lead: LeadInput): string {
  const annualPremium = lead.monthly_premium_chf * 12;
  const cantonName = CONFIG.CANTON_NAMES[lead.canton] || lead.canton;
  const insurerName = lead.insurer_name || getInsurerName(lead.insurer_id);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[DEMO] Agentic Web Showcase - Krankenkassen-Offerte</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">Agentic Web Showcase</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Chat to Contract – Der direkte Weg zum Abschluss</p>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
    
    <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
        <strong>Dies ist eine Demonstration des "Agentic Web".</strong><br><br>
        Sie haben gerade im Chat mit einer KI interagiert, und diese hat <strong>autonom – ohne menschliches Zutun</strong> – 
        diese strukturierte Offerte erstellt und an Sie versendet.
      </p>
    </div>
    
    <p>Guten Tag ${lead.name},</p>
    
    <p>Die KI hat für Sie folgendes Angebot gefunden:</p>
    
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
      <h2 style="color: #1e40af; margin-top: 0; font-size: 20px;">${insurerName}</h2>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">Monatsprämie</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600; font-size: 18px; color: #059669;">CHF ${lead.monthly_premium_chf.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">Jahresprämie</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 500;">CHF ${annualPremium.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">Kanton</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">${cantonName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">Franchise</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">CHF ${lead.franchise_chf}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">Modell</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; text-align: right;">${lead.model_type || 'Standard'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Unfallversicherung</td>
          <td style="padding: 8px 0; text-align: right;">${lead.accident_covered !== false ? 'Ja' : 'Nein'}</td>
        </tr>
      </table>
    </div>
    
    ${lead.message ? `
    <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <strong>Ihre Nachricht:</strong><br>
      ${lead.message}
    </div>
    ` : ''}
    
    <h3 style="color: #1e40af; margin-top: 30px;">📋 Nächste Schritte</h3>
    <ol style="padding-left: 20px;">
      <li style="margin-bottom: 10px;">Prüfen Sie die Angaben in dieser Offerte</li>
      <li style="margin-bottom: 10px;">Besuchen Sie die Webseite von ${insurerName} für den Vertragsabschluss</li>
      <li style="margin-bottom: 10px;">Denken Sie an die Kündigungsfrist: <strong>30. November</strong> für das Folgejahr</li>
    </ol>
    
    <div style="background: #e0e7ff; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #6366f1;">
      <p style="margin: 0; color: #4338ca; font-size: 13px;">
        <strong>Hinweis:</strong> Diese Offerte ist eine <strong>Demo</strong> und basiert auf den offiziellen BAG-Daten für 2026. 
        Die definitiven Konditionen erhalten Sie direkt vom Versicherer.
      </p>
    </div>
    
  </div>
  
  <div style="background: #1e293b; color: #94a3b8; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; font-size: 12px;">
    <p style="margin: 0;"><strong style="color: white;">Agentic Web Demo</strong> powered by <strong style="color: white;">ragit.io</strong></p>
    <p style="margin: 10px 0 0 0;">Datenquelle: Bundesamt für Gesundheit (BAG) | Chat to Contract Showcase</p>
  </div>
  
</body>
</html>
`;
}

// ============================================================================
// ENDPOINT: POST /leads/submit
// ============================================================================
export const leadsSubmit = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 30,
    maxInstances: 50
  },
  (req, res) => {
    corsHandler(req, res, async () => {
      // ✅ SICHERHEIT: API Key Validation
      if (!validateApiKey(req)) {
        res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED: Invalid or missing API key'
        });
        return;
      }

      // Only POST allowed
      if (req.method !== 'POST') {
        res.status(405).json({ 
          success: false, 
          error: 'Method not allowed. Use POST.' 
        });
        return;
      }

      try {
        const body: LeadInput = req.body;

        // Validate required fields
        if (!body.email || !body.name || !body.insurer_id || !body.monthly_premium_chf || !body.canton || !body.age_band || body.franchise_chf === undefined) {
          res.status(400).json({
            success: false,
            error: 'Missing required fields',
            required: ['email', 'name', 'insurer_id', 'monthly_premium_chf', 'canton', 'age_band', 'franchise_chf']
          });
          return;
        }

        // Validate email format
        if (!isValidEmail(body.email)) {
          res.status(400).json({
            success: false,
            error: 'Invalid email format'
          });
          return;
        }

        // Get insurer name if not provided
        const insurerName = body.insurer_name || getInsurerName(body.insurer_id);

        // Prepare lead data
        const leadData = {
          email: body.email.toLowerCase().trim(),
          name: body.name.trim(),
          phone: body.phone?.trim() || null,
          insurer_id: body.insurer_id,
          insurer_name: insurerName,
          monthly_premium_chf: body.monthly_premium_chf,
          annual_premium_chf: body.monthly_premium_chf * 12,
          canton: body.canton.toUpperCase(),
          age_band: body.age_band,
          franchise_chf: body.franchise_chf,
          model_type: body.model_type || 'standard',
          accident_covered: body.accident_covered !== false,
          message: body.message?.trim() || null,
          source: 'chatgpt',
          status: 'new',
          email_sent: false
        };

        // Insert into Supabase
        const { data: insertedLead, error: dbError } = await getSupabase()
          .from('leads')
          .insert(leadData)
          .select('id')
          .single();

        if (dbError) {
          console.error('Supabase insert error:', dbError);
          res.status(500).json({
            success: false,
            error: 'Failed to save lead'
          });
          return;
        }

        const leadId = insertedLead.id;

        // Send confirmation email
        const resendClient = getResend();
        let emailSent = false;

        if (resendClient) {
          try {
            const emailHtml = generateEmailHtml(body);
            
            await resendClient.emails.send({
              from: 'Krankenkassen-Berater <krankenkassen@ragit.io>',
              to: body.email,
              subject: `[DEMO] Agentic Web Showcase: ${insurerName} – CHF ${body.monthly_premium_chf.toFixed(2)}/Mt`,
              html: emailHtml
            });

            emailSent = true;

            // Update lead with email status
            await getSupabase()
              .from('leads')
              .update({ 
                email_sent: true, 
                email_sent_at: new Date().toISOString() 
              })
              .eq('id', leadId);

          } catch (emailError) {
            console.error('Email send error:', emailError);
            // Don't fail the request, just log the error
          }
        } else {
          console.warn('Resend not configured, skipping email');
        }

        // Success response
        res.status(200).json({
          success: true,
          lead_id: leadId,
          email_sent: emailSent,
          message: emailSent 
            ? `Offerte wurde an ${body.email} gesendet` 
            : `Lead gespeichert (E-Mail-Service nicht konfiguriert)`,
          offer: {
            insurer: insurerName,
            monthly_premium_chf: body.monthly_premium_chf,
            annual_premium_chf: body.monthly_premium_chf * 12,
            canton: CONFIG.CANTON_NAMES[body.canton] || body.canton
          }
        });

      } catch (error: any) {
        console.error('Lead submit error:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });
  }
);


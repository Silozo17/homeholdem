import { supabase } from "@/integrations/supabase/client";

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailParams) {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: { to, subject, html, from },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

import { z } from "zod";

const schema = z.object({
  url: z.url().refine(value=>["http:","https:"].includes(new URL(value).protocol)),
  key: z.string().min(20),
});

export function publicEnvironment() {
  const result = schema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return result.success ? result.data : null;
}

export function appUrl() {
  const url=z.url().parse(process.env.APP_URL || (process.env.NODE_ENV==="production"?undefined:"http://localhost:3000"));
  const parsed=new URL(url);
  if(parsed.username||parsed.password||(!["localhost","127.0.0.1"].includes(parsed.hostname)&&parsed.protocol!=="https:"))throw new Error("Nastavte platnú HTTPS adresu aplikácie.");
  return parsed.origin;
}

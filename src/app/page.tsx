import { redirect } from "next/navigation";
import { publicEnvironment } from "@/lib/env";
export default function Home() {
  redirect(publicEnvironment() ? "/klub" : "/nastavenie");
}

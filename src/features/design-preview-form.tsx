"use client";

import { ActionForm, type FormState } from "@/components/forms";
import { FormDialog } from "@/components/ui/dialog";

// Imported only by the explicitly gated /ukazka route. No server mutation.
async function previewAction(
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  if (String(data.get("full_name") ?? "").trim().length < 2) {
    return { fieldErrors: { full_name: "Zadajte aspoň dva znaky." } };
  }
  return {
    success:
      "Formulár je vyplnený správne. Toto je ukážka; žiadne údaje sa neuložili.",
  };
}

export function DesignPreviewForm() {
  return (
    <FormDialog
      title="Ukážka formulára"
      description="Fiktívny profil na kontrolu rozhrania. Údaje sa neodosielajú ani neukladajú."
      label="Ukážka formulára"
    >
      <ActionForm
        action={previewAction}
        fields={[
          { name: "full_name", label: "Meno a priezvisko" },
          { name: "email", label: "E-mail", type: "email" },
        ]}
        submit="Skontrolovať formulár"
      />
    </FormDialog>
  );
}

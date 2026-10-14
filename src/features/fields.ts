import type { Field } from "@/components/forms";
export function formValues(value: object): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).map(([key, val]) => [
      key,
      val === null ? "" : String(val),
    ]),
  );
}
export const roleOptions = [
  { value: "player", label: "Hráč" },
  { value: "coach", label: "Tréner" },
  { value: "guardian", label: "Rodič / zákonný zástupca" },
  { value: "admin", label: "Administrátor" },
];
export const memberFields: Field[] = [
  { name: "full_name", label: "Meno a priezvisko" },
  { name: "email", label: "E-mail", type: "email", required: false },
  { name: "phone", label: "Telefón", type: "tel", required: false },
  {
    name: "birth_date",
    label: "Dátum narodenia",
    type: "date",
    required: false,
    hint: "Pre hráčov: používa sa na určenie plnoletosti a prístupu k platbám.",
  },
];
export function teamFields(
  categories: string[],
  team?: Record<string, string>,
): Field[] {
  const choices = [
    ...new Set([...categories, ...(team?.category ? [team.category] : [])]),
  ];
  return [
    { name: "name", label: "Názov tímu", value: team?.name },
    {
      name: "category",
      label: "Kategória",
      value: team?.category,
      options: choices.length
        ? choices.map((value) => ({ value, label: value }))
        : undefined,
      hint: choices.length
        ? "Kategórie spravujete v nastaveniach klubu. Pôvodná kategória tímu zostáva dostupná."
        : "Klub zatiaľ nemá kategórie. Zadajte vlastnú alebo ich nastavte v nastaveniach klubu.",
    },
    {
      name: "description",
      label: "Popis",
      type: "textarea",
      required: false,
      value: team?.description,
    },
  ];
}
export function eventFields(event?: Record<string, string | null>): Field[] {
  return [
    { name: "title", label: "Názov udalosti" },
    {
      name: "team_id",
      label: "Tím",
      source: "managed-teams" as const,
    },
    {
      name: "kind",
      label: "Typ",
      options: [
        { value: "training", label: "Tréning" },
        { value: "match", label: "Zápas" },
        { value: "tournament", label: "Turnaj" },
        { value: "meeting", label: "Stretnutie" },
        { value: "other", label: "Iná udalosť" },
      ],
    },
    {
      name: "starts_at",
      label: "Začiatok",
      type: "datetime-local",
      hint: "Časové pásmo: Europe/Bratislava",
    },
    { name: "ends_at", label: "Koniec", type: "datetime-local" },
    { name: "venue", label: "Miesto" },
    {
      name: "description",
      label: "Pokyny a popis",
      type: "textarea",
      required: false,
    },
    { name: "opponent", label: "Súper (iba pri zápase)", required: false },
    {
      name: "home",
      label: "Miesto zápasu",
      options: [
        { value: "true", label: "Domáci zápas" },
        { value: "false", label: "Vonkajší zápas" },
      ],
      required: false,
    },
    { name: "score", label: "Výsledok (iba pri zápase)", required: false },
    ...(!event
      ? [
          {
            name: "weeks",
            label: "Počet týždenných opakovaní",
            type: "number",
            value: "1",
            min: "1",
            max: "52",
            hint: "1 = jednorazová udalosť. Každý výskyt sa dá samostatne upraviť alebo zrušiť.",
          },
        ]
      : []),
  ].map((f) => ({ ...f, value: event?.[f.name] ?? f.value }));
}

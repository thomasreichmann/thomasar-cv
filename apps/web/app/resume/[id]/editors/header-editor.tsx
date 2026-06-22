"use client";

import type { Contact, ResumeHeader } from "@thomasar-cv/db/schema";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { emptyContact, removeAt, replaceAt } from "./content-ops";
import {
  AddButton,
  EditorPanel,
  Eyebrow,
  RemoveButton,
  TextField,
} from "./editor-fields";
import { readOptional, readText, toOptional } from "./text";

const CONTACT_KINDS: Contact["kind"][] = [
  "email",
  "phone",
  "website",
  "linkedin",
  "github",
  "twitter",
  "other",
];

const CONTACT_LABEL: Record<Contact["kind"], string> = {
  email: "Email",
  phone: "Phone",
  website: "Website",
  linkedin: "LinkedIn",
  github: "GitHub",
  twitter: "Twitter",
  other: "Other",
};

const CONTACT_PLACEHOLDER: Record<Contact["kind"], string> = {
  email: "you@example.com",
  phone: "+1 555 0100",
  website: "example.com",
  linkedin: "linkedin.com/in/you",
  github: "github.com/you",
  twitter: "@you",
  other: "Value",
};

/**
 * The résumé header: the person's name, an availability note, and the contact
 * links. (The toolbar's name field is a different value - the row's private label
 * - so this is the only place the printed name is edited.)
 */
export function HeaderEditor({
  header,
  onChange,
}: {
  header: ResumeHeader;
  onChange: (header: ResumeHeader) => void;
}) {
  const { contacts } = header;

  return (
    <EditorPanel className="space-y-5">
      <Eyebrow>Header</Eyebrow>

      <div className="space-y-4">
        <TextField
          label="Full name"
          value={readText(header.name)}
          onChange={(name) => onChange({ ...header, name })}
          placeholder="Your name"
          autoComplete="off"
        />
        <TextField
          label="Availability"
          hint="optional"
          value={readOptional(header.availability)}
          onChange={(value) =>
            onChange({ ...header, availability: toOptional(value) })
          }
          placeholder="e.g. Open to remote (US / EU)"
        />
      </div>

      <div className="space-y-2.5">
        <Label>Contacts</Label>
        {contacts.length > 0 ? (
          <ul className="space-y-2">
            {contacts.map((contact, i) => (
              <li key={i}>
                <ContactRow
                  contact={contact}
                  onChange={(next) =>
                    onChange({
                      ...header,
                      contacts: replaceAt(contacts, i, next),
                    })
                  }
                  onRemove={() =>
                    onChange({ ...header, contacts: removeAt(contacts, i) })
                  }
                />
              </li>
            ))}
          </ul>
        ) : null}
        <AddButton
          onClick={() =>
            onChange({ ...header, contacts: [...contacts, emptyContact()] })
          }
        >
          Add contact
        </AddButton>
      </div>
    </EditorPanel>
  );
}

function ContactRow({
  contact,
  onChange,
  onRemove,
}: {
  contact: Contact;
  onChange: (contact: Contact) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={contact.kind}
        onValueChange={(next) =>
          onChange({ ...contact, kind: String(next) as Contact["kind"] })
        }
      >
        <SelectTrigger className="w-32" aria-label="Contact type">
          <SelectValue>
            {(kind) => CONTACT_LABEL[String(kind) as Contact["kind"]]}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {CONTACT_KINDS.map((kind) => (
            <SelectItem key={kind} value={kind}>
              {CONTACT_LABEL[kind]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        className="min-w-40 flex-1"
        value={contact.value}
        onChange={(e) => onChange({ ...contact, value: e.target.value })}
        placeholder={CONTACT_PLACEHOLDER[contact.kind]}
        aria-label="Contact value"
        spellCheck={false}
      />

      <Input
        className="min-w-40 flex-1"
        type="url"
        inputMode="url"
        value={contact.url ?? ""}
        onChange={(e) =>
          onChange({ ...contact, url: toOptional(e.target.value) })
        }
        placeholder="Link (optional)"
        aria-label="Contact link"
        spellCheck={false}
      />

      <RemoveButton label="Remove contact" onClick={onRemove} />
    </div>
  );
}

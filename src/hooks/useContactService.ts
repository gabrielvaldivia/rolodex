"use client";

import { useCallback } from "react";
import { Contact } from "@/types";

export const useContactService = () => {
  const saveContact = useCallback(async (contact: Contact) => {
    const response = await fetch(`/api/contacts/${contact.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: contact.name,
        email: contact.email,
        company: contact.company || "",
        hidden: contact.hidden || false,
        starred: contact.starred || false,
        tags: contact.tags || [],
        photoUrl: contact.photoUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to save contact");
    }

    return response.json();
  }, []);

  const updateContactTags = useCallback(async (
    contact: Contact,
    newTags: string[]
  ) => {
    return saveContact({ ...contact, tags: newTags });
  }, [saveContact]);

  const updateCompanyContacts = useCallback(async (
    companyName: string,
    updatedContacts: Contact[]
  ) => {
    const companyContacts = updatedContacts.filter(
      (contact) => contact.company === companyName
    );

    console.log(
      `🔄 Saving ${companyContacts.length} contacts for company: ${companyName}`
    );

    await Promise.all(
      companyContacts.map(async (contact) => {
        console.log(
          `💾 Saving contact ${contact.id} with tags:`,
          contact.tags
        );

        const response = await fetch(`/api/contacts/${contact.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: contact.name,
            email: contact.email,
            company: contact.company || "",
            hidden: contact.hidden || false,
            starred: contact.starred || false,
            tags: contact.tags || [],
            photoUrl: contact.photoUrl,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(
            `❌ Failed to save contact ${contact.id}:`,
            errorData
          );
          throw new Error(
            `Failed to save contact ${contact.id}: ${
              errorData.error || response.statusText
            }`
          );
        }

        console.log(`✅ Successfully saved contact ${contact.id}`);
      })
    );

    console.log(
      `✅ Successfully saved all contacts in company: ${companyName}`
    );
  }, [saveContact]);

  return { saveContact, updateContactTags, updateCompanyContacts };
}; 
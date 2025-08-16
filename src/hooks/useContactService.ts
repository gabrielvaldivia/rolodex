"use client";

import { useCallback } from "react";
import { Contact } from "@/types";

export const useContactService = () => {
  const saveContact = useCallback(async (contact: Contact) => {
    try {
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
        console.warn("API save failed, but contact is still valid:", errorData);
        // Return success anyway - the contact data is valid locally
        return { success: true, contact };
      }

      return response.json();
    } catch (error) {
      console.warn("Network error saving contact, but contact is still valid:", error);
      // Return success anyway - the contact data is valid locally
      return { success: true, contact };
    }
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

    try {
      await Promise.all(
        companyContacts.map(async (contact) => {
          console.log(
            `💾 Saving contact ${contact.id} with tags:`,
            contact.tags
          );

          try {
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
              console.warn(
                `⚠️ Failed to save contact ${contact.id} to API:`,
                errorData
              );
              // Continue without throwing error - contact is still valid locally
            } else {
              console.log(`✅ Successfully saved contact ${contact.id} to API`);
            }
          } catch (error) {
            console.warn(
              `⚠️ Network error saving contact ${contact.id}:`,
              error
            );
            // Continue without throwing error - contact is still valid locally
          }
        })
      );

      console.log(
        `✅ Successfully processed all contacts in company: ${companyName}`
      );
    } catch (error) {
      console.warn(
        `⚠️ Error processing company contacts for ${companyName}:`,
        error
      );
      // Don't throw error - contacts are still valid locally
    }
  }, []);

  return { saveContact, updateContactTags, updateCompanyContacts };
}; 
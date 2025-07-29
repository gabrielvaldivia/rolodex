import { Contact, Company } from "@/types";
import { generateCompanyWebsite } from "./utils";

// Group contacts by company
export const groupContactsByCompany = (contacts: Contact[]): Company[] => {
  const companiesMap = new Map<string, Company>();

  contacts.forEach((contact) => {
    // Skip contacts without a company
    if (!contact.company || contact.company.trim() === "") {
      return;
    }

    const companyName = contact.company;

    if (!companiesMap.has(companyName)) {
      companiesMap.set(companyName, {
        name: companyName,
        contactCount: 0,
        lastContact: contact.lastContact,
        contacts: [],
        hidden: false,
        website: generateCompanyWebsite(companyName),
      });
    }

    const company = companiesMap.get(companyName)!;
    company.contactCount++;
    company.contacts.push(contact);

    // Update last contact date if this contact is more recent
    if (
      contact.lastContact !== "Unknown" &&
      company.lastContact !== "Unknown"
    ) {
      const contactDate = new Date(contact.lastContact);
      const companyDate = new Date(company.lastContact);
      if (contactDate > companyDate) {
        company.lastContact = contact.lastContact;
      }
    } else if (
      contact.lastContact !== "Unknown" &&
      company.lastContact === "Unknown"
    ) {
      company.lastContact = contact.lastContact;
    }
  });

  // Calculate company hidden, starred states, and aggregate tags
  const companies = Array.from(companiesMap.values());
  companies.forEach((company) => {
    company.hidden = company.contacts.every((contact) => contact.hidden);
    company.starred = company.contacts.some((contact) => contact.starred);

    // Aggregate unique tags from all contacts in the company
    const allTags = new Set<string>();
    company.contacts.forEach((contact) => {
      if (contact.tags) {
        contact.tags.forEach((tag) => allTags.add(tag));
      }
    });
    company.tags = Array.from(allTags).sort();
  });

  return companies;
}; 
// Smart ID Template for Malaysia IC (MyKad)
// Based on Malaysian Identity Card structure

export interface SmartIDTemplate {
  // Personal Information
  fullName: string;
  icNumber: string; // Format: YYMMDD-PB-###G (e.g., 901231-14-5678)

  // Birth Information
  dateOfBirth: string; // DD/MM/YYYY
  placeOfBirth: string;

  // Identity Details
  gender: "Male" | "Female";
  race: string; // Malay, Chinese, Indian, Others
  religion: string;
  citizenship: string;

  // Address
  addressLine1: string;
  addressLine2: string;
  postcode: string;
  city: string;
  state: string;

  // Contact
  phoneNumber?: string;
  email?: string;

  // Biometric (for future integration)
  fingerprintHash?: string;
  photoHash?: string;
}

export const SMART_ID_FIELDS: Array<{
  key: keyof SmartIDTemplate;
  label: string;
  required: boolean;
  type: "text" | "select" | "date";
  options?: string[];
  doubleHash?: boolean;
  placeholder?: string;
}> = [
  // Personal Information Section
  {
    key: "fullName",
    label: "Full Name (as per IC)",
    required: true,
    type: "text",
    placeholder: "e.g., AHMAD BIN ABDULLAH",
  },
  {
    key: "icNumber",
    label: "IC Number",
    required: true,
    type: "text",
    doubleHash: true, // Extra security for IC numbers
    placeholder: "e.g., 901231-14-5678",
  },

  // Birth Information
  {
    key: "dateOfBirth",
    label: "Date of Birth",
    required: true,
    type: "date",
    placeholder: "DD/MM/YYYY",
  },
  {
    key: "placeOfBirth",
    label: "Place of Birth",
    required: true,
    type: "text",
    placeholder: "e.g., Kuala Lumpur",
  },

  // Identity Details
  {
    key: "gender",
    label: "Gender",
    required: true,
    type: "select",
    options: ["Male", "Female"],
  },
  {
    key: "race",
    label: "Race",
    required: true,
    type: "select",
    options: [
      "Malay",
      "Chinese",
      "Indian",
      "Bumiputera Sabah",
      "Bumiputera Sarawak",
      "Others",
    ],
  },
  {
    key: "religion",
    label: "Religion",
    required: true,
    type: "select",
    options: ["Islam", "Buddhism", "Christianity", "Hinduism", "Others"],
  },
  {
    key: "citizenship",
    label: "Citizenship",
    required: true,
    type: "select",
    options: ["Malaysian Citizen", "Permanent Resident", "Others"],
  },

  // Address
  {
    key: "addressLine1",
    label: "Address Line 1",
    required: true,
    type: "text",
    placeholder: "e.g., No. 123, Jalan Merdeka",
  },
  {
    key: "addressLine2",
    label: "Address Line 2",
    required: false,
    type: "text",
    placeholder: "e.g., Taman Sejahtera",
  },
  {
    key: "postcode",
    label: "Postcode",
    required: true,
    type: "text",
    placeholder: "e.g., 50000",
  },
  {
    key: "city",
    label: "City",
    required: true,
    type: "text",
    placeholder: "e.g., Kuala Lumpur",
  },
  {
    key: "state",
    label: "State",
    required: true,
    type: "select",
    options: [
      "Johor",
      "Kedah",
      "Kelantan",
      "Melaka",
      "Negeri Sembilan",
      "Pahang",
      "Penang",
      "Perak",
      "Perlis",
      "Sabah",
      "Sarawak",
      "Selangor",
      "Terengganu",
      "W.P. Kuala Lumpur",
      "W.P. Labuan",
      "W.P. Putrajaya",
    ],
  },

  // Contact (Optional)
  {
    key: "phoneNumber",
    label: "Phone Number (Optional)",
    required: false,
    type: "text",
    placeholder: "e.g., +60123456789",
  },
  {
    key: "email",
    label: "Email Address (Optional)",
    required: false,
    type: "text",
    placeholder: "e.g., ahmad@email.com",
  },
];

// Helper function to validate IC Number format
export function validateICNumber(icNumber: string): boolean {
  // Format: YYMMDD-PB-###G
  const icRegex = /^\d{6}-\d{2}-\d{4}$/;
  return icRegex.test(icNumber);
}

// Helper function to extract info from IC Number
export function parseICNumber(icNumber: string): {
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  birthPlace: string;
  gender: "Male" | "Female";
} | null {
  if (!validateICNumber(icNumber)) return null;

  const [datePart, placePart, serialPart] = icNumber.split("-");

  const year = datePart.substring(0, 2);
  const month = datePart.substring(2, 4);
  const day = datePart.substring(4, 6);

  // Determine century (if > 25, assume 19xx, else 20xx)
  const fullYear = parseInt(year) > 25 ? `19${year}` : `20${year}`;

  // Birth place codes (simplified)
  const birthPlaceCodes: { [key: string]: string } = {
    "01": "Johor",
    "02": "Kedah",
    "03": "Kelantan",
    "04": "Melaka",
    "05": "Negeri Sembilan",
    "06": "Pahang",
    "07": "Penang",
    "08": "Perak",
    "09": "Perlis",
    "10": "Selangor",
    "11": "Terengganu",
    "12": "Sabah",
    "13": "Sarawak",
    "14": "W.P. Kuala Lumpur",
    "15": "W.P. Labuan",
    "16": "W.P. Putrajaya",
  };

  // Last digit determines gender (even = female, odd = male)
  const lastDigit = parseInt(serialPart.charAt(3));
  const gender: "Male" | "Female" = lastDigit % 2 === 0 ? "Female" : "Male";

  return {
    birthYear: fullYear,
    birthMonth: month,
    birthDay: day,
    birthPlace: birthPlaceCodes[placePart] || "Unknown",
    gender,
  };
}

// Validation function for Smart ID
export function validateSmartID(data: Partial<SmartIDTemplate>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  SMART_ID_FIELDS.forEach((field) => {
    if (field.required && !data[field.key]) {
      errors.push(`${field.label} is required`);
    }
  });

  // Validate IC Number format
  if (data.icNumber && !validateICNumber(data.icNumber)) {
    errors.push("IC Number format is invalid (should be YYMMDD-PB-####)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Generate a unique Smart ID identifier
export function generateSmartIDIdentifier(icNumber: string): string {
  return `SMARTID-MY-${icNumber.replace(/-/g, "")}`;
}

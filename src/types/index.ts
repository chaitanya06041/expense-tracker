export type Category =
  | 'Breakfast'
  | 'Lunch'
  | 'Dinner'
  | 'Fruits'
  | 'Petrol'
  | 'Cravings'
  | 'Room'
  | 'Grocery'
  | 'Personal'
  | 'Unsplitted'
  | 'Snacks';

export const ALL_CATEGORIES: Category[] = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Fruits',
  'Petrol',
  'Cravings',
  'Room',
  'Grocery',
  'Personal',
  'Unsplitted',
  'Snacks',
];

/** Categories shown in the Add Expense / Split forms — Unsplitted is excluded
 *  because it is assigned automatically when splitting with the Unsplitted person. */
export const INPUT_CATEGORIES: Category[] = ALL_CATEGORIES.filter(
  (c) => c !== 'Unsplitted'
);

/** Reserved person name for the "Unsplitted" virtual person.
 *  When this person is included in a split, their share is recorded as a
 *  separate expense under the Unsplitted category rather than a split debt. */
export const UNSPLITTED_PERSON_NAME = 'Unsplitted';

export const CATEGORY_COLORS: Record<Category, string> = {
  Breakfast: '#0f62fe',
  Lunch: '#198038',
  Dinner: '#8a3ffc',
  Fruits: '#ff832b',
  Petrol: '#da1e28',
  Cravings: '#ee5396',
  Room: '#009d9a',
  Grocery: '#f1c21b',
  Personal: '#6929c4',
  Unsplitted: '#3d508d',
  Snacks: '#1192e8',
};

export type GraphType = 'bar' | 'line' | 'pie' | 'area';

/** Reserved ID for the "You" person — always pre-selected, never saved in shares */
export const ME_ID = '__me__';

/** The virtual "You" person object */
export const ME_PERSON: Person = { id: ME_ID, name: 'You' };

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  category: Category;
  amount: number;
  note?: string;
}

/** A person in the people directory */
export interface Person {
  id: string;
  name: string;
}

/** One share inside a split record */
export interface SplitShare {
  personId: string;
  amount: number;       // original split amount
  paid: number;         // amount paid back so far
}

/** A split record attached to an expense */
export interface SplitRecord {
  id: string;
  expenseId: string;
  expenseAmount: number;
  expenseCategory: Category;
  expenseNote?: string;
  date: string;         // YYYY-MM-DD
  shares: SplitShare[];
}

/** An immutable reduction/payment log entry for a person */
export interface PaymentLog {
  id: string;
  personId: string;
  amount: number;        // amount reduced (always positive)
  date: string;          // YYYY-MM-DD when the reduction was recorded
  note?: string;
}

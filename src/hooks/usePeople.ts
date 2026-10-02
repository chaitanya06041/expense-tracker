import { useState, useCallback } from 'react';
import { type Person } from '../types';
import { loadPeople, savePeople } from '../utils/splitStorage';
import { v4 } from '../utils/uuid';

export function usePeople() {
  const [people, setPeople] = useState<Person[]>(() => loadPeople());

  const addPerson = useCallback((name: string): Person => {
    const person: Person = { id: v4(), name: name.trim() };
    setPeople((prev) => {
      const updated = [...prev, person];
      savePeople(updated);
      return updated;
    });
    return person;
  }, []);

  const deletePerson = useCallback((id: string) => {
    setPeople((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      savePeople(updated);
      return updated;
    });
  }, []);

  return { people, addPerson, deletePerson };
}

import { useState, useCallback, useEffect } from 'react';
import { type Person } from '../types';
import { loadPeople, insertPerson, deletePerson } from '../utils/splitStorage';
import { v4 } from '../utils/uuid';

export function usePeople() {
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    loadPeople().then(setPeople);
  }, []);

  const addPerson = useCallback(async (name: string): Promise<Person> => {
    const person: Person = { id: v4(), name: name.trim() };
    await insertPerson(person);
    setPeople((prev) => [...prev, person]);
    return person;
  }, []);

  const deletePersonById = useCallback(async (id: string) => {
    await deletePerson(id);
    setPeople((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { people, addPerson, deletePerson: deletePersonById };
}

import React from 'react';
import { type Category, CATEGORY_COLORS } from '../types';

interface Props {
  category: Category;
  selected: boolean;
  onClick: (cat: Category) => void;
  multi?: boolean;
}

const CategoryChip: React.FC<Props> = ({ category, selected, onClick }) => {
  const color = CATEGORY_COLORS[category];
  return (
    <button
      type="button"
      onClick={() => onClick(category)}
      aria-pressed={selected}
      style={
        selected
          ? { backgroundColor: color, borderColor: color, color: '#fff', boxShadow: `0 0 10px ${color}44` }
          : { borderColor: `${color}88`, color: color, backgroundColor: `${color}14` }
      }
      className="inline-flex items-center px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-all duration-150 active:scale-95 select-none"
    >
      {category}
    </button>
  );
};

export default CategoryChip;

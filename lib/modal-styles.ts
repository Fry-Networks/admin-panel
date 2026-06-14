/**
 * Shared modal styles for react-modal components.
 * Used by all table edit modals across the admin panel.
 */

// Base modal styles (used by most tables)
export const modalStyles = {
  content: {
    backgroundColor: '#1f2937',  // gray-800
    color: '#f9fafb',            // gray-50
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 8px 0 rgba(0,0,0,0.4)',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
};

// Modal styles with minimum width (used by some tables)
export const modalStylesWithMinWidth = {
  content: {
    ...modalStyles.content,
    minWidth: '320px',
  },
  overlay: modalStyles.overlay,
};

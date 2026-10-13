import { useRef } from 'react';
import { IconSparkles } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const MAX_SIZE_MB = 5;

// Lets the user pick a policy PDF and passes it to `onFile`.
export default function PolicyUpload({ disabled = false, hint, onFile }) {
  const inputRef = useRef(null);

  const handleChange = (event) => {
    const [file] = event.target.files;
    event.target.value = ''; // so the same file can be chosen again
    if (!file) return;

    if (file.type !== 'application/pdf') {
      notifications.show({ message: 'Please choose a PDF file', color: 'red' });
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      notifications.show({ message: `The PDF must be smaller than ${MAX_SIZE_MB} MB`, color: 'red' });
      return;
    }
    onFile(file);
  };

  return (
    <div className="flex items-center gap-3">
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleChange} />
      <button type="button" className="btn-secondary" disabled={disabled} onClick={() => inputRef.current.click()}>
        <IconSparkles size={16} />
        Autofill from policy PDF
      </button>
    </div>
  );
}

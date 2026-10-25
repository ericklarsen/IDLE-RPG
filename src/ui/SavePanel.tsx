import { useState } from 'react';
import { gameController } from '../state/controller';
import { exportSave, importSave } from '../state/save';
import { useGameStore } from '../state/store';

export default function SavePanel() {
  const reset = useGameStore((state) => state.reset);
  const [code, setCode] = useState('');
  const [importCode, setImportCode] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const handleExport = () => {
    // Make sure a brand-new run is persisted before reading it.
    gameController.flushSave();
    const exported = exportSave();
    if (!exported) {
      setMessage('No save yet — let the knight fight for a moment first.');
      return;
    }

    setCode(exported);
    const clipboard = navigator.clipboard;
    if (!clipboard) {
      setMessage('Code ready — select it and copy.');
      return;
    }
    clipboard
      .writeText(exported)
      .then(() => setMessage('Save code copied to clipboard.'))
      .catch(() => setMessage('Code ready — select it and copy.'));
  };

  const handleImport = () => {
    if (!importSave(importCode)) {
      setMessage('That is not a valid Idle Forge save code. Nothing changed.');
      return;
    }
    gameController.reloadWithoutFlush();
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setMessage('Tap CONFIRM ERASE to wipe this run. This cannot be undone.');
      return;
    }
    reset();
  };

  return (
    <section className="save-panel" aria-label="Save data">
      <div className="section-head">
        <span>SAVE DATA</span>
        <span>LOCAL ONLY</span>
      </div>

      <div className="save-actions">
        <button type="button" onClick={handleExport}>
          EXPORT
        </button>
        <button
          type="button"
          onClick={() => {
            setImportOpen(!importOpen);
            setConfirmReset(false);
            setMessage('');
          }}
        >
          IMPORT
        </button>
        <button
          type="button"
          className={confirmReset ? 'danger armed' : 'danger'}
          onClick={handleReset}
        >
          {confirmReset ? 'CONFIRM ERASE' : 'RESET'}
        </button>
      </div>

      {message && (
        <p className="save-message" role="status">
          {message}
        </p>
      )}

      {code && (
        <textarea
          className="save-code"
          readOnly
          rows={4}
          value={code}
          aria-label="Save code"
          onFocus={(event) => event.currentTarget.select()}
        />
      )}

      {importOpen && (
        <div className="save-import">
          <textarea
            className="save-code"
            rows={3}
            value={importCode}
            placeholder="Paste an Idle Forge save code"
            aria-label="Import save code"
            onChange={(event) => {
              setImportCode(event.target.value);
              setMessage('');
            }}
          />
          <button
            type="button"
            className="save-apply"
            disabled={importCode.trim().length === 0}
            onClick={handleImport}
          >
            APPLY IMPORT
          </button>
        </div>
      )}
    </section>
  );
}

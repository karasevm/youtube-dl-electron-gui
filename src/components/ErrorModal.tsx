import React from 'react';
import { Button, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const ErrorModal: React.FC<{ error: string; onClose: () => void }> = ({
  error,
  onClose,
}: {
  error: string;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <>
      <Modal show={error.length > 0} backdrop="static" centered size="lg">
        <Modal.Header>
          <Modal.Title className="unselectable">{t('Error')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{t(error)}</Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={onClose}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ErrorModal;

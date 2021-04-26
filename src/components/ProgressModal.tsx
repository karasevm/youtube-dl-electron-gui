import React from 'react';
import { Button, Modal, ProgressBar } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { ProgressModalProps } from '../types';

const ProgressModal: React.FC<ProgressModalProps> = ({
  show,
  progress,
  onDownloadCancel,
}: ProgressModalProps) => {
  const { t } = useTranslation();
  return (
    <>
      <Modal show={show} backdrop="static" keyboard={false} centered size="lg">
        <Modal.Header>
          <Modal.Title className="unselectable">{t('Downloading')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ProgressBar now={progress} animated={progress > 99} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={onDownloadCancel}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ProgressModal;

import React from 'react';
import { Row, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { UpdateState } from '../types';

const UpdateStatus: React.FC<UpdateState> = (state: UpdateState) => {
  const { t } = useTranslation();
  switch (state) {
    case UpdateState.Checking:
      return (
        <Row className="mt-1 align-middle justify-content-center">
          <Spinner role="status" animation="border" />
          <span className="ml-2 unselectable align-self-center" id="updateSpan">
            {t('Checking for updates')}
          </span>
        </Row>
      );
    case UpdateState.Updating:
      return (
        <Row className="mt-1 align-middle justify-content-center">
          <Spinner role="status" animation="border" />
          <span className="ml-2 unselectable align-self-center" id="updateSpan">
            {t('Updating to new version')}
          </span>
        </Row>
      );
    case UpdateState.Success:
      return (
        <Row className="mt-1 align-middle justify-content-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            fill="green"
            className="bi bi-check2"
            viewBox="2 2 12 10"
          >
            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
          </svg>
          <span className="ml-2 unselectable align-self-center" id="updateSpan">
            {t('You&apos;re using the latest version')}
          </span>
        </Row>
      );
    default:
    case UpdateState.Error:
      return (
        <Row className="mt-1 align-middle justify-content-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            fill="red"
            className="bi bi-x"
            viewBox="4 4 8 8"
          >
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
          </svg>
          <span className="ml-2 unselectable align-self-center" id="updateSpan">
            {t('Error updating youtube-dl, try restarting')}
          </span>
        </Row>
      );
  }
};

export default UpdateStatus;

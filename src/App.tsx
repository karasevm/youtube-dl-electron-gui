import React, { useEffect, useState } from 'react';
import { ipcRenderer, remote } from 'electron';
import { Button, Col, Container, Form, Row } from 'react-bootstrap';
import Store from 'electron-store';
import { useDebouncedCallback } from 'use-debounce';
import { useTranslation } from 'react-i18next';
import { DownloadAction, ProgressModalState, UpdateState } from './types';
import ProgressModal from './components/ProgressModal';
import ErrorModal from './components/ErrorModal';
import UpdateStatus from './components/UpdateStatus';

export default function App() {
  const [updateState, setUpdateState] = useState(UpdateState.Checking);
  const [progressModalState, setProgressModalState] = useState({
    show: false,
    progress: 0,
  } as ProgressModalState);
  const [savePath, setSavePath] = useState('');
  const [videoURL, setVideoURL] = useState('');
  const [videoQuality, setVideoQuality] = useState(
    '(bestvideo+bestaudio/best)'
  );
  const [ready, setReady] = useState(false);
  const [qualityList, setQualityList] = useState([[]]);
  const prefStore = new Store();
  const [version, setVersion] = useState('');
  const [error, setError] = useState('');

  const debouncedUrl = useDebouncedCallback((value) => {
    ipcRenderer.send('url-changed', value);
  }, 500);

  const { t, i18n } = useTranslation();

  useEffect(() => {
    i18n.changeLanguage(remote.app.getLocale());
    const lastPath = prefStore.get('lastPath', '');

    if (typeof lastPath === 'string' && lastPath.length > 0)
      setSavePath(lastPath);

    ipcRenderer.on('youtube-dl-ready', (_, arg) => {
      if (typeof arg === 'boolean') setReady(arg);
    });
    ipcRenderer.on('quality-list-updated', (_, arg) => {
      if (Array.isArray(arg) && Array.isArray(arg[0])) {
        setQualityList(arg);
      }
    });
    ipcRenderer.on('update-state-updated', (_, arg) => {
      const data = arg as UpdateState;
      setUpdateState(data);
    });
    ipcRenderer.on('version-updated', (_, arg) => {
      setVersion(arg);
    });
    ipcRenderer.on('progress-updated', (_, arg) => {
      setProgressModalState(arg);
    });
    ipcRenderer.on('download-success', () => {
      setProgressModalState({ show: false, progress: 0 });
    });
    ipcRenderer.on('download-error', (_, arg) => {
      setProgressModalState({ show: false, progress: 0 });
      setError(arg);
    });
  }, []);

  const pathChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSavePath(e.target.value);
  };

  const videoURLChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoURL(e.target.value);
    debouncedUrl.callback(e.target.value);
  };

  const browseClickHandler = async () => {
    try {
      const directory = await remote.dialog.showOpenDialog({
        properties: ['openDirectory'],
      });
      if (directory.filePaths.length !== 0) {
        setSavePath(directory.filePaths[0]);
        prefStore.set('lastPath', directory.filePaths[0]);
      }
    } catch (err) {
      setError(err);
    }
  };

  const downloadClickHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    prefStore.set('lastPath', savePath);
    const action: DownloadAction = {
      link: videoURL,
      quality: videoQuality,
      directoryPath: savePath,
    };
    ipcRenderer.send('do-download', action);
  };

  const downloadCancelHandler = async () => {
    ipcRenderer.send('cancel-download');
  };

  const videoQualityChangeHandler = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setVideoQuality(e.target.value);
  };

  const updateClickHandler = () => {
    ipcRenderer.send('update-check');
  };

  const errorCloseHandler = () => {
    setError('');
  };
  return (
    <div>
      <Container>
        <div className="mt-3 align-middle justify-content-center">
          {UpdateStatus(updateState)}
          <Form onSubmit={downloadClickHandler}>
            <Form.Row>
              <Form.Group as={Col}>
                <Form.Label className="unselectable">
                  {t('Save Directory')}
                </Form.Label>
                <Form.Control
                  formNoValidate
                  value={savePath}
                  onChange={pathChangeHandler}
                  type="text"
                />
              </Form.Group>
              <Col xs={2} className="align-self-center mt-3">
                <Button onClick={browseClickHandler} variant="secondary" block>
                  {t('Browse')}
                </Button>
              </Col>
            </Form.Row>
            <Form.Row>
              <Form.Group as={Col}>
                <Form.Label className="unselectable">
                  {t('Video URL')}
                </Form.Label>
                <Form.Control
                  value={videoURL}
                  onChange={videoURLChangeHandler}
                  type="url"
                  required
                  placeholder="URL"
                />
              </Form.Group>
            </Form.Row>
            <Form.Row>
              <Form.Group as={Col}>
                <Form.Label className="unselectable">{t('Quality')}</Form.Label>
                <Form.Control
                  value={videoQuality}
                  onChange={videoQualityChangeHandler}
                  as="select"
                >
                  <option value="(bestvideo+bestaudio/best)">
                    {t('Best')}
                  </option>
                  {qualityList.length > 0 && qualityList[0].length > 0
                    ? qualityList.map((quality) => (
                        <option key={quality[2]} value={quality[2]}>
                          {quality[1]}
                        </option>
                      ))
                    : null}
                </Form.Control>
              </Form.Group>
            </Form.Row>
            <Form.Row>
              <Button className="mt-2" type="primary" disabled={!ready}>
                {t('Download')}
              </Button>
            </Form.Row>
          </Form>
        </div>
        <Row>
          <Col>
            <div className="float-md-right">
              <span className="align-middle version">
                {t('youtube-dl version')}: {version}{' '}
              </span>
              <Button
                disabled={!ready}
                onClick={updateClickHandler}
                size="sm"
                variant="outline-secondary"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi bi-arrow-clockwise"
                  viewBox="0 0 16 16"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
                  />
                  <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
                </svg>
              </Button>
            </div>
          </Col>
        </Row>
      </Container>
      <ProgressModal
        show={progressModalState.show}
        progress={progressModalState.progress}
        onDownloadCancel={downloadCancelHandler}
      />
      <ErrorModal error={error} onClose={errorCloseHandler} />
    </div>
  );
}

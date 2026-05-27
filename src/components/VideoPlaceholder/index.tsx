import clsx from 'clsx';
import styles from './styles.module.css';

type VideoPlaceholderProps = {
  title: string;
  description?: string;
  url?: string;
  className?: string;
};

export default function VideoPlaceholder({title, description, url, className}: VideoPlaceholderProps) {
  return (
    <figure className={clsx(styles.placeholder, className)}>
      <div className={styles.preview}>
        <span className={styles.play}>PLAY</span>
      </div>
      <figcaption>
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
        <span>
          Video link:{' '}
          {url ? (
            <a href={url} target="_blank" rel="noreferrer">
              {url}
            </a>
          ) : (
            'To be added.'
          )}
        </span>
      </figcaption>
    </figure>
  );
}

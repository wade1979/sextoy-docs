import clsx from 'clsx';
import styles from './styles.module.css';

type VideoPlaceholderProps = {
  title: string;
  description?: string;
  src?: string;
  url?: string;
  className?: string;
};

export default function VideoPlaceholder({title, description, src, url, className}: VideoPlaceholderProps) {
  const videoUrl = src ?? url;

  return (
    <figure className={clsx(styles.placeholder, className)}>
      {src ? (
        <video className={styles.video} controls preload="metadata" playsInline>
          <source src={src} />
          <a href={src}>Open video</a>
        </video>
      ) : (
        <div className={styles.preview}>
          <span className={styles.play}>PLAY</span>
        </div>
      )}
      <figcaption>
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
        <span>
          Video link:{' '}
          {videoUrl ? (
            <a href={videoUrl} target="_blank" rel="noreferrer">
              {videoUrl}
            </a>
          ) : (
            'To be added.'
          )}
        </span>
      </figcaption>
    </figure>
  );
}

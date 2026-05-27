import clsx from 'clsx';
import styles from './styles.module.css';

type ImagePlaceholderProps = {
  title: string;
  description?: string;
  className?: string;
};

export default function ImagePlaceholder({title, description, className}: ImagePlaceholderProps) {
  return (
    <figure className={clsx(styles.placeholder, className)}>
      <div className={styles.preview}>
        <span className={styles.icon}>IMG</span>
      </div>
      <figcaption>
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
      </figcaption>
    </figure>
  );
}

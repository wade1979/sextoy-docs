import type {ReactNode} from 'react';
import styles from './styles.module.css';

type PdfOnlyProps = {
  children: ReactNode;
};

export default function PdfOnly({children}: PdfOnlyProps) {
  return <aside className={styles.pdfOnly}>{children}</aside>;
}

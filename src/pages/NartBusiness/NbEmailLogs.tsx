import EmailLogs from '../ManualEmail/EmailLogs';

/**
 * NartBusiness e-posta kayıtları — NartGo'daki ekranın ürünü sabitlenmiş hâli.
 * Ayrı bir ekran yazmak yerine aynı bileşen kullanılır ki liste, süzgeç ve
 * detay davranışı iki panelde tek yerden gelişsin.
 */
export default function NbEmailLogs() {
  return (
    <EmailLogs
      lockedProduct="NartBusiness"
      heading="E-posta Kayıtları"
      subheading="NartBusiness üzerinden giden tüm e-postalar (otomatik + elle). Satıra tıklayınca gövdesi ve gönderimde kullanılan bilgiler görünür."
    />
  );
}

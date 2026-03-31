import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  Store as StoreIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import { FormGrid } from '../../components/Form';
import { associationService } from '../../services/association/associationService';
import { businessService } from '../../services/business/businessService';
import { userService } from '../../services/user/userService';
import { useCreateSubMerchant } from '../../hooks/subMerchants/useSubMerchants';
import {
  IyzicoSubMerchantType,
  OwnerValidationResult,
  SubMerchantCreateRequest,
  SubMerchantOwnerType,
  SubMerchantSummary,
} from '../../types/subMerchant';
import { subMerchantService } from '../../services/subMerchant/subMerchantService';
import {
  cleanIban,
  normalizeIban,
  normalizePhone,
  normalizeTaxLikeNumber,
} from './subMerchantUtils';

const OWNER_TYPE_OPTIONS: SubMerchantOwnerType[] = ['ASSOCIATION', 'BUSINESS', 'INDIVIDUAL'];
const IYZICO_TYPE_OPTIONS: IyzicoSubMerchantType[] = [
  'PERSONAL',
  'PRIVATE_COMPANY',
  'LIMITED_OR_JOINT_STOCK_COMPANY',
];

const initialValues: SubMerchantCreateRequest = {
  ownerType: 'ASSOCIATION',
  ownerId: '',
  name: '',
  email: '',
  contactPhone: '',
  status: 'ACTIVE',
  iyzicoSubMerchantType: 'PERSONAL',
  iban: '',
  address: '',
  contactName: '',
  contactSurname: '',
  identityNumber: '',
  taxNumber: '',
  taxOffice: '',
  legalCompanyTitle: '',
};

const resolveOwner = async (
  ownerType: SubMerchantOwnerType,
  ownerId: string
): Promise<OwnerValidationResult> => {
  if (ownerType === 'ASSOCIATION') {
    const response = await associationService.getAssociationById(ownerId);
    return {
      ownerType,
      ownerId,
      displayName: response.data.name,
      subtitle: response.data.taxNumber ? `Vergi No: ${response.data.taxNumber}` : 'Association',
      email: response.data.email,
      contactPhone: response.data.phoneNumber,
    };
  }

  if (ownerType === 'BUSINESS') {
    const response = await businessService.getBusinessById(ownerId);
    return {
      ownerType,
      ownerId,
      displayName: response.data.name,
      subtitle: response.data.categoryName || 'Business',
      email: response.data.email,
      contactPhone: response.data.phoneNumber,
    };
  }

  const response = await userService.getUserAdmin(ownerId);
  const fullName = [response.data.firstName, response.data.lastName].filter(Boolean).join(' ').trim();
  return {
    ownerType,
    ownerId,
    displayName: response.data.companyName || response.data.displayName || fullName || response.data.email,
    subtitle: response.data.companyName ? fullName || 'Individual account owner' : response.data.email,
    email: response.data.email,
    contactPhone: response.data.gsmNo,
  };
};

const getVisibleFields = (type: IyzicoSubMerchantType) => ({
  contactName: type === 'PERSONAL',
  contactSurname: type === 'PERSONAL',
  identityNumber: type === 'PERSONAL' || type === 'PRIVATE_COMPANY',
  taxNumber: type === 'PRIVATE_COMPANY' || type === 'LIMITED_OR_JOINT_STOCK_COMPANY',
  taxOffice: type === 'PRIVATE_COMPANY' || type === 'LIMITED_OR_JOINT_STOCK_COMPANY',
  legalCompanyTitle: type === 'PRIVATE_COMPANY' || type === 'LIMITED_OR_JOINT_STOCK_COMPANY',
});

const validateForm = (values: SubMerchantCreateRequest, ownerValidated: boolean, duplicate: SubMerchantSummary | null) => {
  const errors: Partial<Record<keyof SubMerchantCreateRequest, string>> = {};
  const visible = getVisibleFields(values.iyzicoSubMerchantType);

  if (!values.ownerType) errors.ownerType = 'Owner type zorunlu.';
  if (!values.ownerId.trim()) errors.ownerId = 'Owner ID zorunlu.';
  if (!ownerValidated) errors.ownerId = 'Önce owner doğrulaması yapın.';
  if (duplicate) errors.ownerId = 'Bu owner için kayıtlı bir alt üye işyeri zaten var.';
  if (!values.name.trim()) errors.name = 'Ad / ünvan zorunlu.';
  if (!values.email.trim()) errors.email = 'E-posta zorunlu.';
  if (!values.contactPhone.trim()) errors.contactPhone = 'Telefon zorunlu.';
  if (!cleanIban(values.iban)) errors.iban = 'IBAN zorunlu.';
  if (!values.address.trim()) errors.address = 'Adres zorunlu.';
  if (visible.contactName && !values.contactName?.trim()) errors.contactName = 'Yetkili adı zorunlu.';
  if (visible.contactSurname && !values.contactSurname?.trim()) errors.contactSurname = 'Yetkili soyadı zorunlu.';
  if (visible.identityNumber && !values.identityNumber?.trim()) errors.identityNumber = 'Kimlik no zorunlu.';
  if (visible.taxNumber && !values.taxNumber?.trim()) errors.taxNumber = 'Vergi no zorunlu.';
  if (visible.taxOffice && !values.taxOffice?.trim()) errors.taxOffice = 'Vergi dairesi zorunlu.';
  if (visible.legalCompanyTitle && !values.legalCompanyTitle?.trim()) {
    errors.legalCompanyTitle = 'Şirket ünvanı zorunlu.';
  }

  return errors;
};

export default function SubMerchantForm() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const createMutation = useCreateSubMerchant();
  const [values, setValues] = useState<SubMerchantCreateRequest>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof SubMerchantCreateRequest, string>>>({});
  const [ownerSummary, setOwnerSummary] = useState<OwnerValidationResult | null>(null);
  const [ownerDuplicate, setOwnerDuplicate] = useState<SubMerchantSummary | null>(null);
  const [validatingOwner, setValidatingOwner] = useState(false);

  const visibleFields = useMemo(
    () => getVisibleFields(values.iyzicoSubMerchantType),
    [values.iyzicoSubMerchantType]
  );

  const ownerValidated = Boolean(ownerSummary) && !ownerDuplicate;
  const activeStep = ownerValidated ? (values.name && values.email ? 2 : 1) : 0;

  const handleFieldChange = <K extends keyof SubMerchantCreateRequest>(field: K, value: SubMerchantCreateRequest[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));

    if (field === 'ownerId' || field === 'ownerType') {
      setOwnerSummary(null);
      setOwnerDuplicate(null);
    }
  };

  const handleValidateOwner = async () => {
    if (!values.ownerId.trim()) {
      setErrors((prev) => ({ ...prev, ownerId: 'Owner ID zorunlu.' }));
      return;
    }

    setValidatingOwner(true);
    setOwnerSummary(null);
    setOwnerDuplicate(null);

    try {
      const [owner, existingResponse] = await Promise.all([
        resolveOwner(values.ownerType, values.ownerId.trim()),
        subMerchantService.listSubMerchants({
          page: 0,
          size: 10,
          ownerType: values.ownerType,
          ownerId: values.ownerId.trim(),
        }),
      ]);

      const duplicate = existingResponse.data.content.find(
        (item) => item.ownerId === values.ownerId.trim()
      ) || null;

      setOwnerSummary(owner);
      setOwnerDuplicate(duplicate);
      if (duplicate) {
        enqueueSnackbar('Bu owner için zaten kayıtlı bir alt üye işyeri var.', { variant: 'warning' });
      } else {
        enqueueSnackbar('Owner doğrulandı.', { variant: 'success' });
      }
    } catch (error) {
      enqueueSnackbar('Owner doğrulaması başarısız oldu.', { variant: 'error' });
    } finally {
      setValidatingOwner(false);
    }
  };

  const handleSubmit = async () => {
    const nextErrors = validateForm(values, ownerValidated, ownerDuplicate);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      enqueueSnackbar('Formda eksik veya hatalı alanlar var.', { variant: 'error' });
      return;
    }

    try {
      const response = await createMutation.mutateAsync({
        idempotencyKey: crypto.randomUUID(),
        payload: {
          ...values,
          ownerId: values.ownerId.trim(),
          name: values.name.trim(),
          email: values.email.trim(),
          contactPhone: normalizePhone(values.contactPhone),
          iban: cleanIban(values.iban),
          address: values.address.trim(),
          contactName: values.contactName?.trim() || undefined,
          contactSurname: values.contactSurname?.trim() || undefined,
          identityNumber: values.identityNumber?.trim() || undefined,
          taxNumber: values.taxNumber?.trim() || undefined,
          taxOffice: values.taxOffice?.trim() || undefined,
          legalCompanyTitle: values.legalCompanyTitle?.trim() || undefined,
        },
      });

      enqueueSnackbar('Alt üye işyeri oluşturuldu.', { variant: 'success' });
      navigate(`/sub-merchants/${response.data.id}`);
    } catch (error) {
      enqueueSnackbar('Alt üye işyeri oluşturulamadı.', { variant: 'error' });
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Alt Üye İşyeri Oluştur"
        subtitle="Uzun tek form yerine tek ekranda adım adım güvenli oluşturma akışı."
        showBackButton
        backPath="/sub-merchants"
        breadcrumbs={[
          { label: 'Kontrol Paneli', href: '/dashboard' },
          { label: 'Alt Üye İşyeri', href: '/sub-merchants' },
          { label: 'Oluştur', active: true },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => navigate('/sub-merchants')}>
              Vazgeç
            </Button>
            <Button variant="contained" onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Kaydediliyor...' : 'Oluştur'}
            </Button>
          </Stack>
        }
      />

      <PageSection noPadding>
        <Box sx={{ p: 3 }}>
          <Stepper activeStep={activeStep}>
            <Step>
              <StepLabel>Owner Bilgisi</StepLabel>
            </Step>
            <Step>
              <StepLabel>Temel Bilgiler</StepLabel>
            </Step>
            <Step>
              <StepLabel>Iyzico Bilgileri</StepLabel>
            </Step>
          </Stepper>
        </Box>
      </PageSection>

      <PageSection
        title="1. Owner Bilgisi"
        subtitle="Önce owner tipini ve id bilgisini doğrulayın. Aynı owner için ikinci create engellenir."
      >
        <FormGrid>
          <TextField
            select
            label="Sahip Türü"
            value={values.ownerType}
            onChange={(event) => handleFieldChange('ownerType', event.target.value as SubMerchantOwnerType)}
            error={Boolean(errors.ownerType)}
            helperText={errors.ownerType}
          >
            {OWNER_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Sahip ID"
            value={values.ownerId}
            onChange={(event) => handleFieldChange('ownerId', event.target.value)}
            error={Boolean(errors.ownerId)}
            helperText={errors.ownerId || 'UUID beklenir.'}
          />
        </FormGrid>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleValidateOwner}
            disabled={validatingOwner}
          >
            {validatingOwner ? 'Doğrulanıyor...' : 'Owner Doğrula'}
          </Button>
          {ownerDuplicate && (
            <Button
              variant="outlined"
              color="warning"
              onClick={() => navigate(`/sub-merchants/${ownerDuplicate.id}`)}
            >
              Mevcut Kayda Git
            </Button>
          )}
        </Stack>

        {ownerSummary && (
          <Card variant="outlined" sx={{ mt: 3, borderColor: ownerDuplicate ? 'warning.main' : 'success.main' }}>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    {ownerDuplicate ? <StoreIcon color="warning" /> : <CheckCircleIcon color="success" />}
                    <Typography variant="h6">{ownerSummary.displayName}</Typography>
                    <Chip size="small" label={ownerSummary.ownerType} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {ownerSummary.subtitle || ownerSummary.ownerId}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {ownerSummary.email || '-'} • {ownerSummary.contactPhone || '-'}
                  </Typography>
                </Box>
                <Alert severity={ownerDuplicate ? 'warning' : 'success'} sx={{ alignItems: 'center' }}>
                  {ownerDuplicate
                    ? 'Bu owner için mevcut sub-merchant var. Yeni create engellendi.'
                    : 'Owner doğrulandı, diğer bloklara geçebilirsiniz.'}
                </Alert>
              </Stack>
            </CardContent>
          </Card>
        )}
      </PageSection>

      <PageSection title="2. Temel Bilgiler" subtitle="Temel iletişim ve durum bilgileri.">
        <FormGrid>
          <TextField
            label="Ad / Ünvan"
            value={values.name}
            onChange={(event) => handleFieldChange('name', event.target.value)}
            error={Boolean(errors.name)}
            helperText={errors.name}
          />
          <TextField
            label="E-posta"
            type="email"
            value={values.email}
            onChange={(event) => handleFieldChange('email', event.target.value)}
            error={Boolean(errors.email)}
            helperText={errors.email}
          />
          <TextField
            label="Telefon"
            value={values.contactPhone}
            onChange={(event) => handleFieldChange('contactPhone', normalizePhone(event.target.value))}
            error={Boolean(errors.contactPhone)}
            helperText={errors.contactPhone || 'Mask: +905551112233'}
          />
          <TextField
            select
            label="Durum"
            value={values.status}
            onChange={(event) => handleFieldChange('status', event.target.value as SubMerchantCreateRequest['status'])}
          >
            <MenuItem value="ACTIVE">ACTIVE</MenuItem>
            <MenuItem value="DISABLED">DISABLED</MenuItem>
          </TextField>
        </FormGrid>
      </PageSection>

      <PageSection title="3. Iyzico Bilgileri" subtitle="Alanlar sub-merchant type seçimine göre dinamik olarak açılır.">
        <FormGrid>
          <TextField
            select
            label="Iyzico Sub Merchant Type"
            value={values.iyzicoSubMerchantType}
            onChange={(event) =>
              handleFieldChange('iyzicoSubMerchantType', event.target.value as IyzicoSubMerchantType)
            }
          >
            {IYZICO_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="IBAN"
            value={values.iban}
            onChange={(event) => handleFieldChange('iban', normalizeIban(event.target.value))}
            error={Boolean(errors.iban)}
            helperText={errors.iban || 'Mask: TR00 0000 0000 0000 0000 0000 00'}
          />
        </FormGrid>

        <TextField
          fullWidth
          multiline
          minRows={3}
          sx={{ mt: 2 }}
          label="Adres"
          value={values.address}
          onChange={(event) => handleFieldChange('address', event.target.value)}
          error={Boolean(errors.address)}
          helperText={errors.address}
        />

        <Divider sx={{ my: 3 }} />

        <FormGrid>
          {visibleFields.contactName && (
            <TextField
              label="Yetkili Adı"
              value={values.contactName}
              onChange={(event) => handleFieldChange('contactName', event.target.value)}
              error={Boolean(errors.contactName)}
              helperText={errors.contactName}
            />
          )}
          {visibleFields.contactSurname && (
            <TextField
              label="Yetkili Soyadı"
              value={values.contactSurname}
              onChange={(event) => handleFieldChange('contactSurname', event.target.value)}
              error={Boolean(errors.contactSurname)}
              helperText={errors.contactSurname}
            />
          )}
          {visibleFields.identityNumber && (
            <TextField
              label="Kimlik No"
              value={values.identityNumber}
              onChange={(event) => handleFieldChange('identityNumber', normalizeTaxLikeNumber(event.target.value, 11))}
              error={Boolean(errors.identityNumber)}
              helperText={errors.identityNumber || '11 haneli maske'}
            />
          )}
          {visibleFields.taxNumber && (
            <TextField
              label="Vergi No"
              value={values.taxNumber}
              onChange={(event) => handleFieldChange('taxNumber', normalizeTaxLikeNumber(event.target.value, 10))}
              error={Boolean(errors.taxNumber)}
              helperText={errors.taxNumber || '10 haneli maske'}
            />
          )}
          {visibleFields.taxOffice && (
            <TextField
              label="Vergi Dairesi"
              value={values.taxOffice}
              onChange={(event) => handleFieldChange('taxOffice', event.target.value)}
              error={Boolean(errors.taxOffice)}
              helperText={errors.taxOffice}
            />
          )}
          {visibleFields.legalCompanyTitle && (
            <TextField
              label="Şirket Ünvanı"
              value={values.legalCompanyTitle}
              onChange={(event) => handleFieldChange('legalCompanyTitle', event.target.value)}
              error={Boolean(errors.legalCompanyTitle)}
              helperText={errors.legalCompanyTitle}
            />
          )}
        </FormGrid>
      </PageSection>
    </PageContainer>
  );
}

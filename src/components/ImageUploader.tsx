import { useState, useRef } from 'react';
import {
    Box,
    Button,
    IconButton,
    Typography,
    Stack,
    ImageList,
    ImageListItem,
    ImageListItemBar,
} from '@mui/material';
import {
    CloudUpload as CloudUploadIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
} from '@mui/icons-material';

interface ImageUploaderProps {
    onImageSelect: (file: File | File[]) => void;
    currentImage?: string | string[];
    multiple?: boolean;
}

export const ImageUploader = ({ onImageSelect, currentImage, multiple = false }: ImageUploaderProps) => {
    const [preview, setPreview] = useState<string | string[]>(
        multiple 
            ? (Array.isArray(currentImage) ? currentImage : currentImage ? [currentImage] : [])
            : (currentImage || '')
    );
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = event.target.files;
        if (!selectedFiles) return;

        const newFiles = Array.from(selectedFiles);
        setFiles(newFiles);

        if (multiple) {
            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
            setPreview(newPreviews);
            onImageSelect(newFiles);
        } else {
            const newPreview = URL.createObjectURL(newFiles[0]);
            setPreview(newPreview);
            onImageSelect(newFiles[0]);
        }
    };

    const handleRemoveImage = (index?: number) => {
        if (multiple) {
            const newFiles = files.filter((_, i) => i !== index);
            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
            setFiles(newFiles);
            setPreview(newPreviews);
            onImageSelect(newFiles);
        } else {
            setFiles([]);
            setPreview('');
            onImageSelect(null as any);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <Box>
            <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                ref={fileInputRef}
                multiple={multiple}
            />
            {multiple ? (
                <Box>
                    <ImageList cols={3} rowHeight={164} gap={8}>
                        {(preview as string[]).map((url, index) => (
                            <ImageListItem key={index}>
                                <img
                                    src={url}
                                    alt={`Preview ${index + 1}`}
                                    loading="lazy"
                                    style={{ height: '164px', objectFit: 'cover' }}
                                />
                                <ImageListItemBar
                                    position="top"
                                    actionIcon={
                                        <IconButton
                                            sx={{ color: 'white' }}
                                            onClick={() => handleRemoveImage(index)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    }
                                />
                            </ImageListItem>
                        ))}
                        <ImageListItem>
                            <Button
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={handleClick}
                                sx={{ height: '100%', width: '100%' }}
                            >
                                Add Image
                            </Button>
                        </ImageListItem>
                    </ImageList>
                </Box>
            ) : (
                <Stack spacing={2}>
                    <Box
                        sx={{
                            border: '2px dashed',
                            borderColor: 'divider',
                            borderRadius: 1,
                            p: 3,
                            textAlign: 'center',
                            cursor: 'pointer',
                            '&:hover': {
                                borderColor: 'primary.main',
                            },
                        }}
                        onClick={handleClick}
                    >
                        {preview ? (
                            <Box position="relative">
                                <img
                                    src={preview as string}
                                    alt="Preview"
                                    style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
                                />
                                <IconButton
                                    sx={{
                                        position: 'absolute',
                                        top: 8,
                                        right: 8,
                                        bgcolor: 'background.paper',
                                        '&:hover': {
                                            bgcolor: 'background.paper',
                                        },
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveImage();
                                    }}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </Box>
                        ) : (
                            <>
                                <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                                <Typography variant="body1" color="text.secondary">
                                    Click to upload image
                                </Typography>
                            </>
                        )}
                    </Box>
                </Stack>
            )}
        </Box>
    );
}; 
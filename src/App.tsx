import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  ChakraProvider,
  ColorModeScript,
  Box,
  Button,
  Container,
  Flex,
  Grid,
  Heading,
  IconButton,
  Input,
  Text,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Image,
  Badge,
  Stack,
  useToast,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Tooltip,
  Select,
  useColorMode,
  Switch,
  FormControl,
  FormLabel,
  Card,
  CardBody,
  CardFooter,
  Divider,
  Center,
  VStack,
  List,
  ListItem,
  ListIcon,
  InputGroup,
  InputRightAddon,
} from "@chakra-ui/react";
import { useDropzone } from "react-dropzone";
import Cropper from "react-easy-crop";
import { nanoid } from "nanoid";

interface Point {
  x: number;
  y: number;
}
interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropInfo {
  id: string;
  dimensions: string;
  timestamp: Date;
}

interface ImageData {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  cropped: boolean;
  cropHistory: CropInfo[];
  lastCrop?: Area;
}

const AspectRatios = {
  FREE: 0,
  ORIGINAL: -1,
  SQUARE: 1,
} as const;

function App() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [currentImage, setCurrentImage] = useState<ImageData | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<number>(AspectRatios.FREE);
  const [originalDimensions, setOriginalDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [cropArea, setCropArea] = useState<Area>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const imageRef = useRef<HTMLImageElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const { colorMode, toggleColorMode } = useColorMode();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const validFiles = acceptedFiles.filter((file) =>
        file.type.startsWith("image/")
      );

      if (validFiles.length === 0) {
        toast({
          title: "Invalid files",
          description: "Only image files are accepted",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const maxFilesAllowed = 10 - images.length;
      if (validFiles.length > maxFilesAllowed) {
        toast({
          title: "Too many files",
          description: `You can only upload up to ${maxFilesAllowed} more images`,
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
      }

      const filesToAdd = validFiles.slice(0, maxFilesAllowed);
      const duplicates: string[] = [];
      const newImages: ImageData[] = [];

      filesToAdd.forEach((file) => {
        const duplicate = images.some(
          (img) => img.name === file.name && img.size === file.size
        );

        if (duplicate) {
          duplicates.push(file.name);
          return;
        }

        const url = URL.createObjectURL(file);
        newImages.push({
          id: nanoid(),
          file,
          url,
          name: file.name,
          size: file.size,
          cropped: false,
          cropHistory: [],
        });
      });

      if (duplicates.length > 0) {
        toast({
          title: "Duplicate files detected",
          description: `${duplicates.join(", ")} already uploaded.`,
          status: "info",
          duration: 3000,
          isClosable: true,
        });
      }

      setImages((prev) => [...prev, ...newImages]);
    },
    [images, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    noClick: true,
  });

  const handleDelete = (id: string) => {
    setImages((prev) => {
      const updatedImages = prev.filter((img) => img.id !== id);
      const deletedImage = prev.find((img) => img.id === id);
      if (deletedImage) URL.revokeObjectURL(deletedImage.url);
      return updatedImages;
    });
  };

  const handleOpenCropper = (image: ImageData) => {
    setCurrentImage(image);

    // Reset crop when opening a new image
    if (!image.lastCrop) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropArea({ x: 0, y: 0, width: 0, height: 0 });
    } else {
      // Restore last crop settings
      setCrop({ x: image.lastCrop.x, y: image.lastCrop.y });
      setCropArea(image.lastCrop);
    }

    onOpen();
  };

  const handleCropComplete = (_: Area, croppedAreaPixels: Area) => {
    setCropArea(croppedAreaPixels);
  };

  const handleCropSave = () => {
    if (!currentImage) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const image = new window.Image();

    image.onload = () => {
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;

      if (ctx) {
        ctx.drawImage(
          image,
          cropArea.x,
          cropArea.y,
          cropArea.width,
          cropArea.height,
          0,
          0,
          cropArea.width,
          cropArea.height
        );

        canvas.toBlob((blob) => {
          if (blob) {
            // Create download link
            const link = document.createElement("a");
            link.download = `cropped-${currentImage.name}`;
            link.href = URL.createObjectURL(blob);
            link.click();

            // Add to crop history
            const dimensionsText = `${cropArea.width} x ${cropArea.height}`;
            const cropInfo: CropInfo = {
              id: nanoid(),
              dimensions: dimensionsText,
              timestamp: new Date(),
            };

            setImages((prev) =>
              prev.map((img) =>
                img.id === currentImage.id
                  ? {
                      ...img,
                      cropped: true,
                      cropHistory: [...img.cropHistory, cropInfo],
                      lastCrop: cropArea,
                    }
                  : img
              )
            );

            toast({
              title: "Image cropped successfully",
              status: "success",
              duration: 3000,
              isClosable: true,
            });
          }
        });
      }
    };

    image.src = currentImage.url;
  };

  const handleImageLoad = () => {
    if (imageRef.current && currentImage) {
      setOriginalDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      });

      // Set initial crop area to full image
      const initialArea = {
        x: 0,
        y: 0,
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      };

      // Only set default area if no previous crop exists
      if (!currentImage.lastCrop) {
        setCropArea(initialArea);
      }
    }
  };

  const handleAspectRatioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseFloat(e.target.value);
    setAspectRatio(value);

    // Adjust crop area to respect new aspect ratio
    if (value === AspectRatios.FREE) {
      // Free form - no adjustment needed
      return;
    } else if (
      value === AspectRatios.ORIGINAL &&
      originalDimensions.width > 0
    ) {
      // Original aspect ratio
      const originalRatio =
        originalDimensions.width / originalDimensions.height;
      adjustCropAreaToRatio(originalRatio);
    } else if (value > 0) {
      // Specific aspect ratio (e.g. 1:1)
      adjustCropAreaToRatio(value);
    }
  };

  const adjustCropAreaToRatio = (ratio: number) => {
    if (!originalDimensions.width) return;

    let newWidth = cropArea.width;
    let newHeight = cropArea.height;

    // Adjust height based on width to maintain aspect ratio
    newHeight = newWidth / ratio;

    // If height exceeds image bounds, adjust width instead
    if (newHeight > originalDimensions.height) {
      newHeight = originalDimensions.height;
      newWidth = newHeight * ratio;
    }

    setCropArea((prev) => ({
      ...prev,
      width: newWidth,
      height: newHeight,
    }));
  };

  const handleCropAreaChange = (property: keyof Area, value: number) => {
    // Ensure the crop stays within bounds and respects aspect ratio
    const newCropArea = { ...cropArea };

    // Set the new value
    newCropArea[property] = value;

    // Adjust other dimensions based on aspect ratio
    if (aspectRatio > 0) {
      if (property === "width") {
        newCropArea.height = value / aspectRatio;
      } else if (property === "height") {
        newCropArea.width = value * aspectRatio;
      }
    } else if (
      aspectRatio === AspectRatios.ORIGINAL &&
      originalDimensions.width > 0
    ) {
      const originalRatio =
        originalDimensions.width / originalDimensions.height;
      if (property === "width") {
        newCropArea.height = value / originalRatio;
      } else if (property === "height") {
        newCropArea.width = value * originalRatio;
      }
    }

    // Ensure crop area stays within image bounds
    if (newCropArea.x < 0) newCropArea.x = 0;
    if (newCropArea.y < 0) newCropArea.y = 0;
    if (newCropArea.x + newCropArea.width > originalDimensions.width) {
      newCropArea.x = originalDimensions.width - newCropArea.width;
    }
    if (newCropArea.y + newCropArea.height > originalDimensions.height) {
      newCropArea.y = originalDimensions.height - newCropArea.height;
    }

    setCropArea(newCropArea);
    setCrop({ x: newCropArea.x, y: newCropArea.y });
  };

  // Set initial color mode
  // useEffect(() => {
  //   if (colorMode !== "dark") {
  //     toggleColorMode();
  //   }
  // }, [colorMode, toggleColorMode]);

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      images.forEach((image) => URL.revokeObjectURL(image.url));
    };
  }, [images]);

  return (
    <Box
      {...getRootProps()}
      minH="100vh"
      p={4}
      borderWidth={isDragActive ? "2px" : "0px"}
      borderStyle="dashed"
      borderColor={isDragActive ? "blue.500" : "transparent"}
      position="relative"
    >
      <input {...getInputProps()} />

      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Image Cropper</Heading>
        <Flex align="center" gap={4}>
          <FormControl display="flex" alignItems="center">
            <FormLabel htmlFor="theme-toggle" mb="0">
              {colorMode === "dark" ? "Dark" : "Light"} Mode
            </FormLabel>
            <Switch
              id="theme-toggle"
              isChecked={colorMode === "light"}
              onChange={toggleColorMode}
            />
          </FormControl>

          <Button
            colorScheme="blue"
            onClick={() => document.getElementById("file-input")?.click()}
            leftIcon={
              <Box as="span" fontSize="lg">
                📁
              </Box>
            }
          >
            Upload Images
          </Button>
          <input
            id="file-input"
            type="file"
            multiple
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files) {
                onDrop(Array.from(e.target.files));
                e.target.value = "";
              }
            }}
          />
        </Flex>
      </Flex>

      {isDragActive && (
        <Center
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="rgba(0, 0, 0, 0.7)"
          color="white"
          zIndex="1"
        >
          <VStack spacing={4}>
            <Box as="span" fontSize="5xl">
              📥
            </Box>
            <Text fontSize="xl" fontWeight="bold">
              Drop images here
            </Text>
          </VStack>
        </Center>
      )}

      <Container maxW="container.xl" centerContent>
        {images.length === 0 ? (
          <Center
            h="300px"
            w="100%"
            borderWidth="2px"
            borderStyle="dashed"
            borderRadius="md"
            borderColor="gray.400"
          >
            <VStack spacing={4}>
              <Box as="span" fontSize="4xl">
                🖼️
              </Box>
              <Text>Upload images to begin</Text>
              <Text fontSize="sm" color="gray.500">
                (Drag and drop anywhere or use the upload button)
              </Text>
            </VStack>
          </Center>
        ) : (
          <Grid
            templateColumns={{
              base: "repeat(1, 1fr)",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(4, 1fr)",
              xl: "repeat(5, 1fr)",
            }}
            gap={6}
            w="100%"
          >
            {images.map((image) => (
              <Card key={image.id} overflow="hidden" variant="outline">
                <Box position="relative">
                  <Image
                    src={image.url}
                    alt={image.name}
                    objectFit="cover"
                    h="200px"
                    w="100%"
                  />
                  {image.cropped && (
                    <Badge
                      position="absolute"
                      top={2}
                      right={2}
                      colorScheme="green"
                      fontSize="xs"
                      px={2}
                      py={1}
                      borderRadius="full"
                    >
                      Cropped
                    </Badge>
                  )}
                </Box>

                <CardBody py={2}>
                  <Text
                    fontWeight="bold"
                    fontSize="sm"
                    noOfLines={1}
                    title={image.name}
                  >
                    {image.name}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {(image.size / (1024 * 1024)).toFixed(2)} MB
                  </Text>
                </CardBody>

                <Divider />

                <CardFooter py={2} px={4} justifyContent="space-between">
                  <Tooltip label="Crop Image">
                    <IconButton
                      aria-label="Crop Image"
                      icon={<Box as="span">✂️</Box>}
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenCropper(image)}
                    />
                  </Tooltip>

                  <Tooltip label="Crop History">
                    <IconButton
                      aria-label="Crop History"
                      icon={<Box as="span">📜</Box>}
                      size="sm"
                      variant="ghost"
                      isDisabled={image.cropHistory.length === 0}
                      onClick={() => {
                        toast({
                          title: "Crop History",
                          description: (
                            <List spacing={1}>
                              {image.cropHistory.length > 0 ? (
                                image.cropHistory.map((crop) => (
                                  <ListItem key={crop.id}>
                                    <Text fontSize="sm">
                                      {crop.dimensions} -{" "}
                                      {crop.timestamp.toLocaleTimeString()}
                                    </Text>
                                  </ListItem>
                                ))
                              ) : (
                                <ListItem>No crop history</ListItem>
                              )}
                            </List>
                          ),
                          status: "info",
                          duration: 5000,
                          isClosable: true,
                        });
                      }}
                    />
                  </Tooltip>

                  <Tooltip label="Delete Image">
                    <IconButton
                      aria-label="Delete Image"
                      icon={<Box as="span">🗑️</Box>}
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(image.id)}
                    />
                  </Tooltip>
                </CardFooter>
              </Card>
            ))}
          </Grid>
        )}
      </Container>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Crop Image</ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            {currentImage && (
              <>
                <Box position="relative" height="400px" mb={4}>
                  <Image
                    ref={imageRef}
                    src={currentImage.url}
                    style={{ display: "none" }}
                    onLoad={handleImageLoad}
                    alt="Original"
                  />
                  <Cropper
                    image={currentImage.url}
                    crop={crop}
                    zoom={zoom}
                    aspect={aspectRatio > 0 ? aspectRatio : undefined}
                    onCropChange={setCrop}
                    onCropComplete={handleCropComplete}
                    onZoomChange={setZoom}
                    showGrid
                  />
                </Box>

                <Stack spacing={4}>
                  <Flex justify="space-between" align="center">
                    <Text fontWeight="bold">Zoom</Text>
                    <Flex w="70%" align="center">
                      <Text mr={2} fontSize="sm">
                        1x
                      </Text>
                      <Slider
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        onChange={(value) => setZoom(value)}
                        flex="1"
                      >
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb />
                      </Slider>
                      <Text ml={2} fontSize="sm">
                        3x
                      </Text>
                    </Flex>
                  </Flex>

                  <Flex justify="space-between" align="center">
                    <Text fontWeight="bold">Aspect Ratio</Text>
                    <Select
                      w="70%"
                      value={aspectRatio}
                      onChange={handleAspectRatioChange}
                    >
                      <option value={AspectRatios.FREE}>Free-form</option>
                      <option value={AspectRatios.ORIGINAL}>Original</option>
                      <option value={1}>1:1 (Square)</option>
                      <option value={16 / 9}>16:9</option>
                      <option value={4 / 3}>4:3</option>
                      <option value={3 / 2}>3:2</option>
                      <option value={9 / 16}>9:16 (Portrait)</option>
                    </Select>
                  </Flex>

                  <Divider />

                  <Text fontWeight="bold" mb={1}>
                    Crop Dimensions
                  </Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <FormControl>
                      <FormLabel fontSize="sm">X Position</FormLabel>
                      <NumberInput
                        min={0}
                        max={originalDimensions.width - cropArea.width}
                        value={Math.round(cropArea.x)}
                        onChange={(_, value) =>
                          handleCropAreaChange("x", value)
                        }
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm">Y Position</FormLabel>
                      <NumberInput
                        min={0}
                        max={originalDimensions.height - cropArea.height}
                        value={Math.round(cropArea.y)}
                        onChange={(_, value) =>
                          handleCropAreaChange("y", value)
                        }
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm">Width</FormLabel>
                      <NumberInput
                        min={10}
                        max={originalDimensions.width}
                        value={Math.round(cropArea.width)}
                        onChange={(_, value) =>
                          handleCropAreaChange("width", value)
                        }
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm">Height</FormLabel>
                      <NumberInput
                        min={10}
                        max={originalDimensions.height}
                        value={Math.round(cropArea.height)}
                        onChange={(_, value) =>
                          handleCropAreaChange("height", value)
                        }
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>
                  </Grid>

                  <Box>
                    <Text fontSize="sm" color="gray.500">
                      Original Image: {originalDimensions.width} x{" "}
                      {originalDimensions.height}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      Crop Size: {Math.round(cropArea.width)} x{" "}
                      {Math.round(cropArea.height)}
                    </Text>
                  </Box>
                </Stack>
              </>
            )}
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleCropSave}>
              Crop & Download
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default App;
export { App };

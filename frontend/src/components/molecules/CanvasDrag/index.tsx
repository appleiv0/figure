import { useEffect, useRef, useState } from "react";
import {
  Circle,
  Group,
  Image,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
} from "react-konva";
import useImage from "use-image";
import { getItemLocalStorage } from "../../../utils/helper";
import { USER } from "../../../constants/common.constant";
import { useSetPosition } from "../../../services/hooks/hookFigures";
import useStore from "../../../store";

type CanvasDragProps = {
  handleActiveChat: (message: string) => void;
};

const CanvasDrag = ({ handleActiveChat }: CanvasDragProps) => {
  const stageRef = useRef<any>(null);
  const groups = useRef<any>([]);
  const selectedCards = useStore((state: any) => state.selectedCards);
  const [images, setImages] = useState<any>([]);
  const [iconFlip] = useImage("./assets/images/icons/icon-flip.svg");
  const [iconCheck] = useImage("./assets/images/icons/icon-check.svg");
  const [positions, setPositions] = useState<any>([]);
  const [cursor, setCursor] = useState("default");
  const [activeIndex, setActiveIndex] = useState(-1);

  const [checkedState, setCheckedState] = useState(() =>
    selectedCards.map(() => false)
  );
  const userInfo = getItemLocalStorage(USER);
  const { fetchPosition } = useSetPosition();
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  // Scale based on canvas width (base: 1162px)
  const scale = Math.min(canvasDimensions.width / 1162, canvasDimensions.height / 576);
  const rectBox = { width: 752 * scale, height: 388 * scale };
  const rectItemBox = { width: 158 * scale, height: 186 * scale };
  const centerPoint = {
    x: canvasDimensions.width / 2,
    y: canvasDimensions.height / 2,
  };

  useEffect(() => {
    const handleResize = () => {
      const contentElement = document.querySelector(".content");
      if (contentElement) {
        const stage = stageRef.current.getStage();
        const contentWidth = contentElement.clientWidth
          ? contentElement.clientWidth
          : window.innerWidth;
        const contentHeight = contentElement.clientHeight
          ? contentElement.clientHeight
          : window.innerHeight;
        const aspectRatio = 1162 / 576;

        const aspWindow = contentWidth / contentHeight;
        let canvasWidth, canvasHeight;

        if (aspWindow > aspectRatio) {
          canvasWidth = contentWidth * aspectRatio;
          canvasHeight = contentHeight;
        } else {
          canvasWidth = contentWidth;
          canvasHeight = contentWidth / aspectRatio;
        }

        setCanvasDimensions({
          width: canvasWidth,
          height: canvasHeight,
        });
        stage.batchDraw();
      }
    };
    handleResize(); // Call on initial render
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const updatedPositions = groups.current.map((group: any, index: number) => {
      const absolutePosition = group.getAbsolutePosition();
      const figureData = selectedCards[index];

      return {
        ...figureData,
        direction: checkedState[index] ? 1 : 0,
        position: {
          p1: [Math.floor(absolutePosition.x), Math.floor(absolutePosition.y)],
          p2: [
            Math.floor(absolutePosition.x + rectItemBox.width),
            Math.floor(absolutePosition.y + rectItemBox.height),
          ],
        },
      };
    });

    setPositions(updatedPositions);
  }, [groups]);

  useEffect(() => {
    const loadImages = () => {
      const loadedImages = selectedCards.map((card: any) => {
        const image = new window.Image();
        image.src = card.img;
        image.onload = () => {
          // Once the image is loaded, update the state with the new image
          setImages((prevImages: any) => [...prevImages, image]);
        };
        return image;
      });

      // Optionally, you might want to handle image loading errors
      loadedImages.forEach((image: any) => {
        image.onerror = () => {
          console.error(`Failed to load image ${image.src}`);
        };
      });
    };

    loadImages();

    // Cleanup function
    return () => {
      // Optionally, you can clean up resources here
    };
  }, [selectedCards]);

  const handleDragMove = () => {
    const updatedPositions = groups.current.map((group: any, index: number) => {
      const absolutePosition = group.getAbsolutePosition();
      const figureData = selectedCards[index];

      return {
        ...figureData,
        direction: checkedState[index] ? 1 : 0,
        position: {
          p1: [Math.floor(absolutePosition.x), Math.floor(absolutePosition.y)],
          p2: [
            Math.floor(absolutePosition.x + rectItemBox.width),
            Math.floor(absolutePosition.y + rectItemBox.height),
          ],
        },
      };
    });

    setPositions(updatedPositions);
  };

  const handleCircleClick = () => {
    setCheckedState(
      checkedState.map((bool: boolean, j: number) => {
        if (j === activeIndex) {
          if (checkedState[activeIndex] === true) {
            return false;
          }
          return true;
        } else {
          return bool;
        }
      })
    );
  };

  const handleSubmitPosition = async () => {
    // Capture canvas as base64 image
    let canvasImage = "";
    if (stageRef.current) {
      const stage = stageRef.current.getStage();
      canvasImage = stage.toDataURL({ pixelRatio: 2 });
    }

    const data = {
      kidName: userInfo.kidname,
      receiptNo: userInfo.receiptNo,
      centerH: Math.floor(canvasDimensions.width / 2),
      centerV: Math.floor(canvasDimensions.height / 2),
      figures: positions,
      canvasImage: canvasImage,
    };
    const response = await fetchPosition(data);
    if (response) {
      handleActiveChat(response.message);
    }
  };

  return (
    <div className="content mx-auto w-full max-w-[72.625rem] canvas-container">
      <Stage
        ref={stageRef}
        width={canvasDimensions.width}
        height={canvasDimensions.height}
        className={`canvas-drag-flip ${
          cursor === "pointer" ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <Layer>
          <Rect
            x={(canvasDimensions.width - rectBox.width) / 2}
            y={(canvasDimensions.height - rectBox.height) / 2}
            width={rectBox.width}
            height={rectBox.height}
            fill="#EDECE9"
            cornerRadius={10}
          />
          <Line
            points={[centerPoint.x, canvasDimensions.height, centerPoint.x, 0]}
            stroke="#CCC"
            strokeWidth={3}
            dash={[5, 5]}
          />
          <Line
            points={[0, centerPoint.y, canvasDimensions.width, centerPoint.y]}
            stroke="#CCC"
            strokeWidth={3}
            dash={[5, 5]}
          />
          <Text
            text="손가락으로 동물 카드를 움직일 수 있어요!"
            fontSize={Math.max(14, 24 * scale)}
            fontWeight="bold"
            align="center"
            fill="#2EB500"
            width={canvasDimensions.width}
            y={canvasDimensions.height - (50 * scale)}
          />
          {selectedCards.map((animal: any, index: any) => (
            <Group
              draggable
              x={(168 * scale) + index * rectItemBox.width + index * (10 * scale)}
              y={(canvasDimensions.height - rectItemBox.height) / 2}
              key={index}
              ref={(node) => (groups.current[index] = node)}
              onDragEnd={() => handleDragMove()}
            >
              <Rect
                width={rectItemBox.width}
                height={rectItemBox.height}
                stroke={index === activeIndex ? "#2EB500" : "#EDECE9"}
                strokeWidth={2}
                fill="white"
                shadowColor="rgba(153, 153, 153, 0.10)"
                shadowBlur={10}
                shadowOffsetX={4}
                shadowOffsetY={4}
                cornerRadius={10}
                onClick={() => setActiveIndex(index)}
                onTap={() => setActiveIndex(index)}
              />
              <Image
                image={images[index]}
                width={rectItemBox.width - (20 * scale)}
                height={rectItemBox.height - (50 * scale)}
                scaleX={checkedState[index] ? -1 : 1}
                offsetX={checkedState[index] ? (rectItemBox.width - (20 * scale)) : 0}
                x={10 * scale}
                y={5 * scale}
                listening={false}
              />
              <Text
                text={animal.figure}
                fontVariant="bold"
                fontFamily="Noto Sans"
                fontSize={Math.max(12, 20 * scale)}
                listening={false}
                align="center"
                width={rectItemBox.width}
                y={152 * scale}
              />
            </Group>
          ))}
          <Group x={20 * scale} y={canvasDimensions.height - (90 * scale)}>
            <Circle
              x={(Math.max(70 * scale, 44)) / 2}
              y={(Math.max(70 * scale, 44)) / 2}
              width={Math.max(70 * scale, 44)}
              height={Math.max(70 * scale, 44)}
              fill="#ffffff"
              stroke="#2EB500"
              strokeWidth={2}
              onClick={handleCircleClick}
              onTap={handleCircleClick}
              onMouseEnter={() => setCursor("pointer")}
              onMouseLeave={() => setCursor("default")}
            />
            <Image
              image={iconFlip}
              width={Math.max(16, 24 * scale)}
              height={Math.max(16, 24 * scale)}
              listening={false}
              x={(Math.max(70 * scale, 44) - Math.max(16, 24 * scale)) / 2}
              y={(Math.max(70 * scale, 44) - Math.max(16, 24 * scale)) / 2 - (8 * scale)}
            />
            <Text text="반전" align="center" fontSize={Math.max(10, 14 * scale)} width={Math.max(70 * scale, 44)} y={50 * scale} />
          </Group>
          <Group
            x={canvasDimensions.width - (Math.max(70 * scale, 44)) - (20 * scale)}
            y={canvasDimensions.height - (90 * scale)}
          >
            <Circle
              x={(Math.max(70 * scale, 44)) / 2}
              y={(Math.max(70 * scale, 44)) / 2}
              width={Math.max(70 * scale, 44)}
              height={Math.max(70 * scale, 44)}
              fill="#2EB500"
              stroke="#2EB500"
              strokeWidth={2}
              onClick={handleSubmitPosition}
              onTap={handleSubmitPosition}
              onMouseEnter={() => setCursor("pointer")}
              onMouseLeave={() => setCursor("default")}
            />
            <Image
              image={iconCheck}
              width={Math.max(14, 20 * scale)}
              height={Math.max(14, 20 * scale)}
              listening={false}
              x={(Math.max(70 * scale, 44) - Math.max(14, 20 * scale)) / 2}
              y={(Math.max(70 * scale, 44) - Math.max(14, 20 * scale)) / 2 - (8 * scale)}
            />
            <Text text="확인" align="center" fill="white" fontSize={Math.max(10, 14 * scale)} width={Math.max(70 * scale, 44)} y={48 * scale} />
          </Group>
        </Layer>
      </Stage>
    </div>
  );
};

export default CanvasDrag;

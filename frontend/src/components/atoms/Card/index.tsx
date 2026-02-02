type CardProps = {
  imgUrl: string;
  name: string;
  className?: string;
};

const Card = ({ imgUrl, name, className }: CardProps) => {
  return (
    <div
      className={`flex flex-col items-center rounded-[0.625rem] bg-white shadow-lg px-3 pt-2 pb-5 ${className}`}
    >
      <img
        src={`./assets/images/Animal/` + imgUrl}
        className="max-w-[7.9375rem]"
        alt="a dog"
      />
      <p className="text-xl font-bold">{name}</p>
    </div>
  );
};

export default Card;

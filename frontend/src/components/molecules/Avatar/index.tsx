type AvatarProps = {
  kidname: string;
};
const Avatar = ({ kidname }: AvatarProps) => {
  return (
    <div className="relative w-full text-center">
      <img
        src={`./assets/images/img-${kidname ? "user" : "user-default"}.png`}
        alt="avt"
        className="w-[7.5rem] h-[7.5rem] rounded-full mx-auto block mb-3"
      />
      <div className="text-lg font-semibold leading-none capitalize mb-1">
        {kidname}
      </div>
    </div>
  );
};

export default Avatar;

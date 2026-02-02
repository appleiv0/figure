const Loading = () => {
  return (
    <div className="mind-loading">
      <div role="status">
        <div className="lds-ripple">
          <div></div>
          <div></div>
        </div>
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};

export default Loading;
